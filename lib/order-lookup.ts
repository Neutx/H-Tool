/**
 * Order Lookup Logic
 * Validates and looks up orders for customer portal
 */

import { prisma } from "./prisma";

/**
 * Validate order lookup credentials
 */
export async function validateOrderLookup(
  orderNumber: string,
  email: string
): Promise<{
  valid: boolean;
  error?: string;
  orderId?: string;
}> {
  // Validate inputs
  if (!orderNumber || !email) {
    return {
      valid: false,
      error: "Order number and email are required",
    };
  }

  // Normalize inputs first
  const normalizedOrderNumber = orderNumber.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  // Validate email format after trimming
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      valid: false,
      error: "Invalid email format",
    };
  }

  try {
    // Look up order
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: normalizedOrderNumber,
        customer: {
          email: normalizedEmail,
        },
      },
      select: { id: true },
    });

    if (!order) {
      return {
        valid: false,
        error: "Order not found. Please check your order number and email.",
      };
    }

    return {
      valid: true,
      orderId: order.id,
    };
  } catch (error) {
    console.error("Order lookup error:", error);
    return {
      valid: false,
      error: "An error occurred. Please try again.",
    };
  }
}

/**
 * Get order details with cancellation status
 */
export async function getOrderForPortal(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        lineItems: {
          include: {
            product: {
              select: {
                title: true,
                imageUrl: true,
              },
            },
          },
        },
        cancellationRequest: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Transform to customer-facing format
    const customerOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      status: order.status,
      customer: {
        name: order.customer.name || undefined,
        email: order.customer.email,
      },
      lineItems: order.lineItems.map((item) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
        imageUrl: item.product?.imageUrl,
      })),
      cancellationRequest: order.cancellationRequest?.[0]
        ? {
            id: order.cancellationRequest[0].id,
            status: order.cancellationRequest[0].status,
            reason: order.cancellationRequest[0].reason,
            reasonCategory: order.cancellationRequest[0].reasonCategory,
            createdAt: order.cancellationRequest[0].createdAt,
            updatedAt: order.cancellationRequest[0].updatedAt,
            customerNotes: order.cancellationRequest[0].customerNotes || undefined,
            adminResponse: order.cancellationRequest[0].adminResponse || undefined,
            refundPreference: order.cancellationRequest[0].refundPreference || undefined,
          }
        : undefined,
    };

    return { success: true, data: customerOrder };
  } catch (error) {
    console.error("Get order error:", error);
    return { success: false, error: "Failed to fetch order" };
  }
}

/**
 * Check if order is eligible for cancellation
 */
export function isOrderCancellable(order: any): {
  eligible: boolean;
  reason?: string;
} {
  // Already has pending or approved cancellation
  if (
    order.cancellationRequest &&
    ["pending", "approved", "processing"].includes(
      order.cancellationRequest.status
    )
  ) {
    return {
      eligible: false,
      reason: "A cancellation request is already in progress",
    };
  }

  // Already completed cancellation
  if (order.cancellationRequest?.status === "completed") {
    return {
      eligible: false,
      reason: "This order has already been cancelled",
    };
  }

  // Order already delivered
  if (order.status && ["delivered", "completed"].includes(order.status.toLowerCase())) {
    return {
      eligible: false,
      reason: "Order has already been delivered and cannot be cancelled",
    };
  }

  // Order is eligible
  return { eligible: true };
}

/**
 * Generate secure order lookup token (for URL sharing)
 */
export function generateOrderToken(orderId: string, email: string): string {
  // Simple token generation (in production, use crypto for better security)
  const data = `${orderId}:${email}:${Date.now()}`;
  return Buffer.from(data).toString("base64url");
}

/**
 * Decode order token
 */
export function decodeOrderToken(token: string): {
  valid: boolean;
  orderId?: string;
  email?: string;
} {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [orderId, email] = decoded.split(":");

    if (!orderId || !email) {
      return { valid: false };
    }

    return { valid: true, orderId, email };
  } catch {
    return { valid: false };
  }
}

