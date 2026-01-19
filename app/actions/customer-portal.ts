"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validateOrderLookup, getOrderForPortal, isOrderCancellable } from "@/lib/order-lookup";
import type { CancellationRequestData } from "@/lib/customer-portal-types";

/**
 * Look up order by order number and email
 */
export async function lookupOrder(orderNumber: string, email: string) {
  try {
    const validation = await validateOrderLookup(orderNumber, email);

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const order = await getOrderForPortal(validation.orderId!);

    return order;
  } catch (error) {
    console.error("Lookup order error:", error);
    return { success: false, error: "Failed to look up order" };
  }
}

/**
 * Submit cancellation request from customer portal
 */
export async function submitCancellationRequest(data: CancellationRequestData) {
  try {
    // Get order
    const orderResult = await getOrderForPortal(data.orderId);
    if (!orderResult.success || !orderResult.data) {
      return { success: false, error: "Order not found" };
    }

    const order = orderResult.data;

    // Check eligibility
    const eligibility = isOrderCancellable(order);
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason };
    }

    // Create cancellation request
    const cancellationRequest = await prisma.cancellationRequest.create({
      data: {
        orderId: data.orderId,
        customerId: order.customer.email || "unknown", // Using email as customer identifier
        organizationId: "cmkirf3lj0000jhhexsx6p1e3", // Demo org ID
        reason: data.reason,
        reasonCategory: data.reasonCategory,
        notes: data.customerNotes,
        refundPreference: data.refundPreference || "full",
        initiatedBy: "customer",
        status: "pending",
      },
    });

    // Create review queue item if manual review needed
    // (This would be determined by rules engine in production)
    await prisma.reviewQueueItem.create({
      data: {
        cancellationRequestId: cancellationRequest.id,
        orderId: data.orderId,
        riskLevel: "medium",
      },
    });

    revalidatePath("/customer-portal");
    return {
      success: true,
      message: "Cancellation request submitted successfully",
      data: cancellationRequest,
    };
  } catch (error) {
    console.error("Submit cancellation error:", error);
    return { success: false, error: "Failed to submit cancellation request" };
  }
}

/**
 * Get cancellation request status with timeline
 */
export async function getCancellationStatus(cancellationRequestId: string) {
  try {
    const request = await prisma.cancellationRequest.findUnique({
      where: { id: cancellationRequestId },
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
          },
        },
        cancellationRecord: {
          include: {
            refundTransactions: true,
          },
        },
        reviewQueueItem: true,
      },
    });

    if (!request) {
      return { success: false, error: "Cancellation request not found" };
    }

    // Build timeline
    const timeline: Record<string, Date> = {
      requested: request.createdAt,
    };

    if (request.status === "approved" || request.status === "completed") {
      timeline.approved = request.updatedAt;
    }

    if (request.cancellationRecord) {
      timeline.processing = request.cancellationRecord.createdAt;

      if (request.cancellationRecord.refundStatus === "completed" && request.cancellationRecord.completedAt) {
        timeline.refunded = request.cancellationRecord.completedAt;
      }

      if (request.status === "completed" && request.cancellationRecord.completedAt) {
        timeline.completed = request.cancellationRecord.completedAt;
      }
    }

    if (request.status === "denied") {
      timeline.denied = request.updatedAt;
    }

    return {
      success: true,
      data: {
        id: request.id,
        status: request.status,
        reason: request.reason,
        reasonCategory: request.reasonCategory,
        customerNotes: request.notes || null,
        adminResponse: request.reviewQueueItem?.reviewNotes || null,
        refundPreference: request.refundPreference,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        timeline,
        refundAmount: request.cancellationRecord?.refundAmount || 0,
        refundStatus: request.cancellationRecord?.refundStatus || null,
      },
    };
  } catch (error) {
    console.error("Get cancellation status error:", error);
    return { success: false, error: "Failed to fetch cancellation status" };
  }
}

/**
 * Add customer response to info request
 */
export async function respondToInfoRequest(
  cancellationRequestId: string,
  response: string
) {
  try {
    const request = await prisma.cancellationRequest.findUnique({
      where: { id: cancellationRequestId },
    });

    if (!request) {
      return { success: false, error: "Cancellation request not found" };
    }

    if (request.status !== "info_requested") {
      return {
        success: false,
        error: "This request is not awaiting information",
      };
    }

    // Update request with customer response
    await prisma.cancellationRequest.update({
      where: { id: cancellationRequestId },
      data: {
        notes: response,
        status: "pending", // Move back to pending for admin review
        updatedAt: new Date(),
      },
    });

    // Update review queue item
    await prisma.reviewQueueItem.updateMany({
      where: { cancellationRequestId },
      data: {
        reviewStatus: "pending",
        updatedAt: new Date(),
      },
    });

    revalidatePath("/customer-portal");
    return {
      success: true,
      message: "Response submitted successfully",
    };
  } catch (error) {
    console.error("Respond to info request error:", error);
    return { success: false, error: "Failed to submit response" };
  }
}

/**
 * Cancel a pending cancellation request
 */
export async function cancelCancellationRequest(cancellationRequestId: string) {
  try {
    const request = await prisma.cancellationRequest.findUnique({
      where: { id: cancellationRequestId },
    });

    if (!request) {
      return { success: false, error: "Cancellation request not found" };
    }

    if (!["pending", "info_requested"].includes(request.status)) {
      return {
        success: false,
        error: "Only pending requests can be cancelled",
      };
    }

    // Update to cancelled status
    await prisma.cancellationRequest.update({
      where: { id: cancellationRequestId },
      data: {
        status: "denied",
        notes: "Cancelled by customer",
        updatedAt: new Date(),
      },
    });

    // Remove from review queue
    await prisma.reviewQueueItem.deleteMany({
      where: { cancellationRequestId },
    });

    revalidatePath("/customer-portal");
    return {
      success: true,
      message: "Cancellation request cancelled",
    };
  } catch (error) {
    console.error("Cancel cancellation request error:", error);
    return { success: false, error: "Failed to cancel request" };
  }
}

