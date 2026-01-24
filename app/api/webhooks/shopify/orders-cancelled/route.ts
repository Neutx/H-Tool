import { NextRequest, NextResponse } from "next/server";
import { parseWebhookPayload, respondToWebhook, respondToWebhookError } from "@/lib/shopify-webhook-utils";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime (Prisma requires Node.js)
export const runtime = "nodejs";

/**
 * Handle orders/cancelled webhook from Shopify
 * Shopify sends this when an order is cancelled
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and verify webhook payload
    const { payload, isValid } = await parseWebhookPayload<{
      id: string;
      name: string;
      cancelled_at: string;
      cancel_reason: string | null;
      shop_domain?: string;
    }>(request);

    if (!isValid || !payload) {
      return respondToWebhookError("Invalid webhook signature", 401);
    }

    // Get shop domain from header or payload
    const shopDomain = request.headers.get("X-Shopify-Shop-Domain") || payload.shop_domain;
    if (!shopDomain) {
      console.error("[Webhook] Missing shop domain");
      return respondToWebhookError("Missing shop domain", 400);
    }

    // Find organization by Shopify store URL
    const organization = await prisma.organization.findFirst({
      where: {
        shopifyStoreUrl: shopDomain.replace(".myshopify.com", ""),
      },
    });

    if (!organization) {
      console.error(`[Webhook] Organization not found for shop: ${shopDomain}`);
      return respondToWebhookError("Organization not found", 404);
    }

    // Extract order data
    const orderId = payload.id.toString();
    const cancelledAt = new Date(payload.cancelled_at);

    // Upsert cancellation (idempotent)
    await prisma.shopifyCancellation.upsert({
      where: { shopifyCancellationId: orderId },
      update: {
        cancelledAt,
        cancelReason: payload.cancel_reason || null,
      },
      create: {
        shopifyCancellationId: orderId,
        shopifyOrderId: orderId,
        cancelledAt,
        cancelReason: payload.cancel_reason || null,
      },
    });

    // Update order if it exists
    const order = await prisma.order.findFirst({
      where: { shopifyOrderId: orderId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          cancelledAt,
          cancelReason: payload.cancel_reason || null,
        },
      });
    }

    // Update webhook last triggered timestamp
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "orders/cancelled",
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    console.log(`[Webhook] Processed cancellation for order ${orderId}`);
    return respondToWebhook();
  } catch (error) {
    console.error("[Webhook] Error processing orders/cancelled:", error);
    return respondToWebhookError(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
