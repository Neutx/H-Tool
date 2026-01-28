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

    // Find organization by Shopify store URL (supports both `kreo-tech` and `kreo-tech.myshopify.com`)
    const shopDomainNormalized = shopDomain.toLowerCase().trim();
    const shopSlug = shopDomainNormalized.replace(".myshopify.com", "");
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { shopifyStoreUrl: shopSlug },
          { shopifyStoreUrl: shopDomainNormalized },
          { shopifyStoreUrl: `${shopSlug}.myshopify.com` },
        ],
      },
    });

    if (!organization) {
      console.error(`[Webhook] Organization not found for shop: ${shopDomain}`);
      return respondToWebhookError("Organization not found", 404);
    }

    // Update webhook test status
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "orders/cancelled",
      },
      data: {
        testStatus: "success",
        lastTestedAt: new Date(),
      },
    });

    // Extract order data
    const orderIdRaw = payload.id.toString();
    const orderIdNumeric = orderIdRaw.startsWith("gid://") 
      ? orderIdRaw.split("/").pop() || orderIdRaw
      : orderIdRaw;
    const orderIdBigInt = BigInt(orderIdNumeric);
    const cancelledAt = new Date(payload.cancelled_at);

    // Upsert cancellation (idempotent)
    await prisma.shopifyCancellation.upsert({
      where: { shopifyCancellationId: orderIdBigInt },
      update: {
        cancelledAt,
        cancelReason: payload.cancel_reason || null,
      },
      create: {
        shopifyCancellationId: orderIdBigInt,
        shopifyOrderId: orderIdBigInt,
        cancelledAt,
        cancelReason: payload.cancel_reason || null,
      },
    });

    // Update order if it exists
    const order = await prisma.order.findFirst({
      where: { shopifyOrderId: orderIdBigInt },
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

    console.log(`[Webhook] Processed cancellation for order ${orderIdNumeric}`);

    // Log webhook event
    await prisma.webhookEvent.create({
      data: {
        organizationId: organization.id,
        topic: "orders/cancelled",
        payload: payload,
        headers: { shopDomain },
        success: true,
      },
    });

    return respondToWebhook();
  } catch (error) {
    console.error("[Webhook] Error processing orders/cancelled:", error);
    
    // Try to log error event
    try {
      const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
      if (shopDomain) {
        const org = await prisma.organization.findFirst({
          where: { shopifyStoreUrl: shopDomain.replace(".myshopify.com", "") },
        });
        if (org) {
          await prisma.webhookEvent.create({
            data: {
              organizationId: org.id,
              topic: "orders/cancelled",
              payload: {},
              success: false,
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }
    } catch (logError) {
      console.error("[Webhook] Failed to log error event:", logError);
    }

    return respondToWebhookError(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
