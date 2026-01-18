"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Get all review queue items for an organization
 */
export async function getReviewQueueItems(organizationId: string) {
  try {
    const items = await prisma.reviewQueueItem.findMany({
      where: {
        order: { organizationId },
      },
      include: {
        order: {
          include: {
            customer: true,
            lineItems: {
              include: { product: true },
            },
          },
        },
        cancellationRequest: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: items };
  } catch (error) {
    console.error("Error fetching review queue:", error);
    return { success: false, error: "Failed to fetch review queue" };
  }
}

/**
 * Get a single review queue item
 */
export async function getReviewQueueItem(id: string) {
  try {
    const item = await prisma.reviewQueueItem.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            lineItems: {
              include: { product: true },
            },
          },
        },
        cancellationRequest: true,
      },
    });

    if (!item) {
      return { success: false, error: "Review item not found" };
    }

    return { success: true, data: item };
  } catch (error) {
    console.error("Error fetching review item:", error);
    return { success: false, error: "Failed to fetch review item" };
  }
}

/**
 * Approve a cancellation request
 */
export async function approveCancellation(
  reviewQueueItemId: string,
  reviewedBy: string,
  notes?: string
) {
  try {
    const reviewItem = await prisma.reviewQueueItem.findUnique({
      where: { id: reviewQueueItemId },
      include: { cancellationRequest: true },
    });

    if (!reviewItem) {
      return { success: false, error: "Review item not found" };
    }

    // Update review queue item
    await prisma.reviewQueueItem.update({
      where: { id: reviewQueueItemId },
      data: {
        reviewStatus: "approved",
        reviewedBy,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
    });

    // Update cancellation request status
    await prisma.cancellationRequest.update({
      where: { id: reviewItem.cancellationRequestId },
      data: { status: "approved" },
    });

    revalidatePath("/cancellation-rules");
    return { success: true, message: "Cancellation approved successfully" };
  } catch (error) {
    console.error("Error approving cancellation:", error);
    return { success: false, error: "Failed to approve cancellation" };
  }
}

/**
 * Deny a cancellation request
 */
export async function denyCancellation(
  reviewQueueItemId: string,
  reviewedBy: string,
  notes?: string
) {
  try {
    const reviewItem = await prisma.reviewQueueItem.findUnique({
      where: { id: reviewQueueItemId },
      include: { cancellationRequest: true },
    });

    if (!reviewItem) {
      return { success: false, error: "Review item not found" };
    }

    // Update review queue item
    await prisma.reviewQueueItem.update({
      where: { id: reviewQueueItemId },
      data: {
        reviewStatus: "denied",
        reviewedBy,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
    });

    // Update cancellation request status
    await prisma.cancellationRequest.update({
      where: { id: reviewItem.cancellationRequestId },
      data: { status: "denied" },
    });

    revalidatePath("/cancellation-rules");
    return { success: true, message: "Cancellation denied successfully" };
  } catch (error) {
    console.error("Error denying cancellation:", error);
    return { success: false, error: "Failed to deny cancellation" };
  }
}

/**
 * Request additional information from customer
 */
export async function requestInfo(
  reviewQueueItemId: string,
  reviewedBy: string,
  message: string
) {
  try {
    const reviewItem = await prisma.reviewQueueItem.findUnique({
      where: { id: reviewQueueItemId },
    });

    if (!reviewItem) {
      return { success: false, error: "Review item not found" };
    }

    // Update review queue item
    await prisma.reviewQueueItem.update({
      where: { id: reviewQueueItemId },
      data: {
        reviewStatus: "info_requested",
        reviewedBy,
        reviewNotes: message,
        reviewedAt: new Date(),
      },
    });

    // TODO: Send notification to customer (implement in later milestone)
    console.log("TODO: Send info request to customer:", message);

    revalidatePath("/cancellation-rules");
    return { success: true, message: "Information requested successfully" };
  } catch (error) {
    console.error("Error requesting info:", error);
    return { success: false, error: "Failed to request information" };
  }
}

/**
 * Escalate a review item
 */
export async function escalateReview(
  reviewQueueItemId: string,
  reviewedBy: string,
  notes?: string
) {
  try {
    const reviewItem = await prisma.reviewQueueItem.findUnique({
      where: { id: reviewQueueItemId },
    });

    if (!reviewItem) {
      return { success: false, error: "Review item not found" };
    }

    // Update review queue item
    await prisma.reviewQueueItem.update({
      where: { id: reviewQueueItemId },
      data: {
        reviewStatus: "escalated",
        reviewedBy,
        reviewNotes: notes,
        reviewedAt: new Date(),
      },
    });

    // TODO: Send notification to support team (implement in later milestone)
    console.log("TODO: Send escalation notification:", notes);

    revalidatePath("/cancellation-rules");
    return { success: true, message: "Review escalated successfully" };
  } catch (error) {
    console.error("Error escalating review:", error);
    return { success: false, error: "Failed to escalate review" };
  }
}

/**
 * Add audit notes to a review item
 */
export async function addReviewNotes(
  reviewQueueItemId: string,
  reviewedBy: string,
  notes: string
) {
  try {
    await prisma.reviewQueueItem.update({
      where: { id: reviewQueueItemId },
      data: {
        reviewNotes: notes,
        reviewedBy,
      },
    });

    revalidatePath("/cancellation-rules");
    return { success: true, message: "Notes added successfully" };
  } catch (error) {
    console.error("Error adding notes:", error);
    return { success: false, error: "Failed to add notes" };
  }
}

