/**
 * Refund Synchronization Service
 * Handles fetching refunds from Shopify and storing in database
 */

import { shopify } from "./shopify";
import { prisma } from "./prisma";

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  newCount: number;
  updatedCount: number;
  errors: string[];
}

export async function syncShopifyRefunds(
  organizationId: string,
  limit: number = 50
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedCount: 0,
    newCount: 0,
    updatedCount: 0,
    errors: [],
  };

  try {
    // Fetch refunds from Shopify
    const shopifyResponse = await shopify.getRecentRefunds(limit);

    if (!shopifyResponse.success || !shopifyResponse.data) {
      throw new Error("Failed to fetch refunds");
    }

    const refunds = ("refunds" in shopifyResponse.data && shopifyResponse.data.refunds?.edges) || [];

    for (const edge of refunds) {
      try {
        const refund = edge.node;

        // Extract product names
        const productNames =
          refund.refundLineItems?.edges
            ?.map((item: any) => item.node.lineItem?.name)
            .filter(Boolean)
            .join(", ") || "";

        // Check if refund exists
        const existing = await prisma.refundTransaction.findFirst({
          where: { shopifyRefundId: refund.id },
        });

        const refundData: any = {
          shopifyRefundId: refund.id,
          shopifyOrderId: refund.order?.id,
          shopifyCustomerId: refund.order?.customer?.id,
          refundAmount: parseFloat(refund.totalRefunded?.amount || "0"),
          status: mapShopifyStatus(refund.transactions?.[0]?.status),
          productNames: productNames || null,
          shopifySyncedAt: new Date(),
          shopifyCreatedAt: refund.createdAt
            ? new Date(refund.createdAt)
            : null,
          shopifyNote: refund.note || null,
          refundLineItems: refund.refundLineItems?.edges || null,
          syncedFromShopify: true,
          paymentProcessor: refund.transactions?.[0]?.gateway || null,
          transactionId: refund.transactions?.[0]?.id || null,
          processedAt:
            refund.transactions?.[0]?.processedAt
              ? new Date(refund.transactions[0].processedAt)
              : null,
        };

        if (existing) {
          // Update existing
          await prisma.refundTransaction.update({
            where: { id: existing.id },
            data: refundData,
          });
          result.updatedCount++;
        } else {
          // Create new (need to create order and customer first if not exists)
          const order = await ensureOrderExists(
            refund.order,
            organizationId
          );

          // Find or create a cancellation record placeholder if needed
          let cancellationRecord = await prisma.cancellationRecord.findFirst({
            where: { orderId: order.id },
          });

          if (!cancellationRecord) {
            // Create a minimal cancellation record for synced refunds
            const cancellationRequest = await prisma.cancellationRequest.create({
              data: {
                orderId: order.id,
                customerId: order.customerId,
                organizationId,
                reason: "Synced from Shopify",
                reasonCategory: "other",
                initiatedBy: "system",
                refundPreference: "full",
                status: "completed",
              },
            });

            cancellationRecord = await prisma.cancellationRecord.create({
              data: {
                cancellationRequestId: cancellationRequest.id,
                orderId: order.id,
                customerId: order.customerId,
                organizationId,
                initiatedBy: "system",
                reason: "Synced from Shopify",
                reasonCategory: "other",
                refundAmount: refundData.refundAmount,
                refundStatus: refundData.status,
                restockDecision: "no_restock",
                completedAt: new Date(),
              },
            });
          }

          await prisma.refundTransaction.create({
            data: {
              ...refundData,
              orderId: order.id,
              cancellationRecordId: cancellationRecord.id,
            },
          });
          result.newCount++;
        }

        result.syncedCount++;
      } catch (itemError) {
        const errorMsg =
          itemError instanceof Error ? itemError.message : String(itemError);
        result.errors.push(`Error syncing refund: ${errorMsg}`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  return result;
}

function mapShopifyStatus(status: string): string {
  const statusMap: Record<string, string> = {
    success: "completed",
    pending: "pending",
    failure: "failed",
    error: "failed",
  };
  return statusMap[status?.toLowerCase()] || "pending";
}

async function ensureOrderExists(shopifyOrder: any, organizationId: string) {
  if (!shopifyOrder) {
    throw new Error("Shopify order data is missing");
  }

  // Check if order exists
  let order = await prisma.order.findFirst({
    where: { shopifyOrderId: shopifyOrder.id },
  });

  if (!order) {
    // Create customer first
    const customer = await ensureCustomerExists(
      shopifyOrder.customer,
      organizationId
    );

    // Calculate total amount from line items if available
    let totalAmount = 0;
    if (shopifyOrder.lineItems?.edges) {
      totalAmount = shopifyOrder.lineItems.edges.reduce(
        (sum: number, item: any) => {
          // Estimate price if not available
          return sum + (item.node.quantity || 0) * 100; // Default price
        },
        0
      );
    }

    order = await prisma.order.create({
      data: {
        shopifyOrderId: shopifyOrder.id,
        orderNumber: shopifyOrder.name || `ORDER-${shopifyOrder.id}`,
        customerId: customer.id,
        organizationId,
        status: "refunded",
        fulfillmentStatus: "fulfilled",
        paymentStatus: "refunded",
        totalAmount,
        currency: "INR",
        orderDate: new Date(),
      },
    });
  }

  return order;
}

async function ensureCustomerExists(
  shopifyCustomer: any,
  organizationId: string
) {
  if (!shopifyCustomer) {
    // Create anonymous customer
    return prisma.customer.create({
      data: {
        organizationId,
        email: "unknown@example.com",
        name: "Unknown Customer",
      },
    });
  }

  let customer = await prisma.customer.findFirst({
    where: { shopifyCustomerId: shopifyCustomer.id },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        shopifyCustomerId: shopifyCustomer.id,
        organizationId,
        email: shopifyCustomer.email || "unknown@example.com",
        name: shopifyCustomer.displayName || "Unknown Customer",
      },
    });
  }

  return customer;
}
