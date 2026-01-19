"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { shopify } from "@/lib/shopify";
import {
  calculateFullRefund,
  calculatePartialRefund,
  calculateCustomRefund,
  validateRefundAmount,
} from "@/lib/refund-calculator";
import type { RefundPreference } from "@/lib/types";

/**
 * Get all refund transactions for an organization
 */
export async function getRefunds(organizationId: string) {
  try {
    const refunds = await prisma.refundTransaction.findMany({
      where: {
        order: { organizationId },
      },
      include: {
        order: {
          include: {
            customer: true,
            lineItems: true,
          },
        },
        cancellationRecord: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: refunds };
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return { success: false, error: "Failed to fetch refunds" };
  }
}

/**
 * Get refund metrics for dashboard
 */
export async function getRefundMetrics(organizationId: string) {
  try {
    const [
      totalRefunds,
      pendingRefunds,
      completedRefunds,
      failedRefunds,
      refundSum,
    ] = await Promise.all([
      prisma.refundTransaction.count({
        where: { order: { organizationId } },
      }),
      prisma.refundTransaction.count({
        where: {
          order: { organizationId },
          status: "pending",
        },
      }),
      prisma.refundTransaction.count({
        where: {
          order: { organizationId },
          status: "completed",
        },
      }),
      prisma.refundTransaction.count({
        where: {
          order: { organizationId },
          status: "failed",
        },
      }),
      prisma.refundTransaction.aggregate({
        where: {
          order: { organizationId },
          status: "completed",
        },
        _sum: { refundAmount: true },
      }),
    ]);

    const successRate =
      totalRefunds > 0 ? (completedRefunds / totalRefunds) * 100 : 0;

    return {
      success: true,
      data: {
        totalRefunds,
        pendingRefunds,
        completedRefunds,
        failedRefunds,
        totalRefunded: refundSum._sum.refundAmount || 0,
        successRate: Math.round(successRate),
      },
    };
  } catch (error) {
    console.error("Error fetching refund metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}

/**
 * Process a refund (full, partial, or custom)
 */
export async function processRefund(data: {
  cancellationRequestId: string;
  orderId: string;
  refundType: RefundPreference;
  customAmount?: number;
  selectedItems?: Array<{
    lineItemId: string;
    quantity: number;
  }>;
  reason?: string;
}) {
  try {
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        lineItems: {
          include: { product: true },
        },
        customer: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Calculate refund amount
    let calculation;
    let refundAmount: number;

    switch (data.refundType) {
      case "full":
        calculation = calculateFullRefund(order);
        refundAmount = calculation.totalRefund;
        break;

      case "partial":
        if (!data.selectedItems || data.selectedItems.length === 0) {
          return {
            success: false,
            error: "Selected items required for partial refund",
          };
        }
        calculation = calculatePartialRefund(order, data.selectedItems);
        refundAmount = calculation.totalRefund;
        break;

      case "none":
        refundAmount = 0;
        break;

      default:
        if (data.customAmount) {
          calculation = calculateCustomRefund(order, data.customAmount);
          refundAmount = data.customAmount;
        } else {
          return { success: false, error: "Invalid refund type" };
        }
    }

    // Validate refund amount
    if (refundAmount > 0) {
      const validation = validateRefundAmount(refundAmount, order);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    // Create cancellation record if doesn't exist
    const cancellationRequest = await prisma.cancellationRequest.findUnique({
      where: { id: data.cancellationRequestId },
    });

    if (!cancellationRequest) {
      return { success: false, error: "Cancellation request not found" };
    }

    let cancellationRecord = await prisma.cancellationRecord.findUnique({
      where: { cancellationRequestId: data.cancellationRequestId },
    });

    if (!cancellationRecord) {
      cancellationRecord = await prisma.cancellationRecord.create({
        data: {
          cancellationRequestId: data.cancellationRequestId,
          orderId: data.orderId,
          customerId: order.customerId,
          organizationId: order.organizationId,
          initiatedBy: cancellationRequest.initiatedBy,
          reason: cancellationRequest.reason,
          reasonCategory: cancellationRequest.reasonCategory,
          refundAmount,
          refundStatus: refundAmount > 0 ? "pending" : "none",
          restockDecision: "auto_restock",
        },
      });
    }

    // Create refund transaction
    const refundTransaction = await prisma.refundTransaction.create({
      data: {
        cancellationRecordId: cancellationRecord.id,
        orderId: data.orderId,
        refundAmount,
        taxAmount: calculation?.taxAmount || 0,
        shippingAmount: calculation?.shippingAmount || 0,
        status: refundAmount > 0 ? "pending" : "completed",
        paymentProcessor: "shopify",
      },
    });

    // Process refund with Shopify (or mock for now)
    if (refundAmount > 0 && order.shopifyOrderId) {
      try {
        // Use mock for development
        const shopifyResult = await shopify.mockCreateRefund(
          order.shopifyOrderId,
          refundAmount
        );

        if (shopifyResult.success) {
          // Update refund transaction
          await prisma.refundTransaction.update({
            where: { id: refundTransaction.id },
            data: {
              status: "completed",
              shopifyRefundId: shopifyResult.data?.refund?.id,
              transactionId: shopifyResult.data?.refund?.transactions?.[0]?.id,
              processedAt: new Date(),
            },
          });

          // Update cancellation record
          await prisma.cancellationRecord.update({
            where: { id: cancellationRecord.id },
            data: {
              refundStatus: "completed",
              completedAt: new Date(),
            },
          });

          // Update cancellation request
          await prisma.cancellationRequest.update({
            where: { id: data.cancellationRequestId },
            data: { status: "completed" },
          });
        } else {
          // Mark as failed
          await prisma.refundTransaction.update({
            where: { id: refundTransaction.id },
            data: {
              status: "failed",
              errorMessage: "Shopify API error",
            },
          });
        }
      } catch (error) {
        // Handle error
        await prisma.refundTransaction.update({
          where: { id: refundTransaction.id },
          data: {
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }

    revalidatePath("/refunds");
    return {
      success: true,
      message: "Refund processed successfully",
      data: refundTransaction,
    };
  } catch (error) {
    console.error("Error processing refund:", error);
    return { success: false, error: "Failed to process refund" };
  }
}

/**
 * Retry a failed refund
 */
export async function retryRefund(refundId: string) {
  try {
    const refund = await prisma.refundTransaction.findUnique({
      where: { id: refundId },
      include: { order: true },
    });

    if (!refund) {
      return { success: false, error: "Refund not found" };
    }

    if (refund.status !== "failed") {
      return { success: false, error: "Only failed refunds can be retried" };
    }

    // Update retry attempts
    await prisma.refundTransaction.update({
      where: { id: refundId },
      data: {
        retryAttempts: refund.retryAttempts + 1,
        lastRetryAt: new Date(),
        status: "pending",
      },
    });

    // Try processing again
    if (refund.order.shopifyOrderId) {
      const shopifyResult = await shopify.mockCreateRefund(
        refund.order.shopifyOrderId,
        refund.refundAmount
      );

      if (shopifyResult.success) {
        await prisma.refundTransaction.update({
          where: { id: refundId },
          data: {
            status: "completed",
            shopifyRefundId: shopifyResult.data?.refund?.id,
            processedAt: new Date(),
            errorMessage: null,
            errorCode: null,
          },
        });

        revalidatePath("/refunds");
        return { success: true, message: "Refund retry successful" };
      } else {
        await prisma.refundTransaction.update({
          where: { id: refundId },
          data: {
            status: "failed",
            errorMessage: "Retry failed",
          },
        });

        return { success: false, error: "Refund retry failed" };
      }
    }

    return { success: false, error: "No Shopify order ID" };
  } catch (error) {
    console.error("Error retrying refund:", error);
    return { success: false, error: "Failed to retry refund" };
  }
}

/**
 * Get refund details
 */
export async function getRefundDetails(refundId: string) {
  try {
    const refund = await prisma.refundTransaction.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            customer: true,
            lineItems: {
              include: { product: true },
            },
          },
        },
        cancellationRecord: {
          include: {
            cancellationRequest: true,
          },
        },
      },
    });

    if (!refund) {
      return { success: false, error: "Refund not found" };
    }

    return { success: true, data: refund };
  } catch (error) {
    console.error("Error fetching refund details:", error);
    return { success: false, error: "Failed to fetch refund details" };
  }
}

/**
 * Manually trigger refund sync from Shopify
 */
export async function syncRefundsFromShopify(organizationId: string) {
  try {
    // Import sync service directly instead of calling API route
    // This avoids CORS issues and works better in server actions
    const { syncShopifyRefunds } = await import("@/lib/refund-sync-service");
    const result = await syncShopifyRefunds(organizationId, 50);

    if (result.success) {
      revalidatePath("/refunds");
    }

    return {
      success: result.success,
      message: result.success
        ? `Synced ${result.syncedCount} refunds (${result.newCount} new, ${result.updatedCount} updated)`
        : "Sync failed",
      data: result,
    };
  } catch (error) {
    console.error("Manual sync error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to trigger sync",
    };
  }
}

