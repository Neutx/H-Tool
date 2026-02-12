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
    const webhookTopic = "orders/cancelled";
    const shopDomainHeader = request.headers.get("X-Shopify-Shop-Domain") || null;
    const webhookIdHeader = request.headers.get("X-Shopify-Webhook-Id") || null;
    const isSelfTest = !!request.headers.get("X-H-Tool-Test-Topic");

    // Parse and verify webhook payload
    const { payload, isValid } = await parseWebhookPayload<{
      id: string;
      name: string;
      cancelled_at: string;
      cancel_reason: string | null;
      shop_domain?: string;
    }>(request);

    if (!isValid || !payload) {
      try {
        if (shopDomainHeader) {
          const shopDomainNormalized = shopDomainHeader.toLowerCase().trim();
          const shopSlug = shopDomainNormalized.replace(".myshopify.com", "");
          const org = await prisma.organization.findFirst({
            where: {
              OR: [
                { shopifyStoreUrl: shopSlug },
                { shopifyStoreUrl: shopDomainNormalized },
                { shopifyStoreUrl: `${shopSlug}.myshopify.com` },
              ],
            },
          });
          if (org) {
            await prisma.webhookEvent.create({
              data: {
                organizationId: org.id,
                topic: webhookTopic,
                payload: {},
                headers: {
                  shopDomain: shopDomainHeader,
                  webhookId: webhookIdHeader,
                  isSelfTest,
                },
                success: false,
                errorMessage: "Invalid webhook signature",
              },
            });
          }
        }
      } catch {
        // ignore
      }
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

    // Update order if it exists
    const order = await prisma.order.findFirst({
      where: { shopifyOrderId: orderIdBigInt },
    });

    if (!order) {
      console.warn(`[Webhook] Order ${orderIdNumeric} not found in DB, skipping cancellation upsert`);

      // Update webhook last triggered timestamp (still received the webhook)
      await prisma.shopifyWebhook.updateMany({
        where: {
          organizationId: organization.id,
          topic: "orders/cancelled",
        },
        data: {
          lastTriggeredAt: new Date(),
        },
      });

      // Log webhook event (received but not fully processed)
      await prisma.webhookEvent.create({
        data: {
          organizationId: organization.id,
          topic: webhookTopic,
          payload: payload,
          headers: {
            shopDomain,
            webhookId: webhookIdHeader,
            isSelfTest,
          },
          success: false,
          errorMessage: "Order not found in DB; cancellation record not created",
        },
      });

      return respondToWebhook();
    }

    // Upsert cancellation (idempotent). Requires the Order to exist due to FK constraint.
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

    await prisma.order.update({
      where: { id: order.id },
      data: {
        cancelledAt,
        cancelReason: payload.cancel_reason || null,
      },
    });

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
        topic: webhookTopic,
        payload: payload,
        headers: {
          shopDomain,
          webhookId: webhookIdHeader,
          isSelfTest,
        },
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
        const shopDomainNormalized = shopDomain.toLowerCase().trim();
        const shopSlug = shopDomainNormalized.replace(".myshopify.com", "");
        const org = await prisma.organization.findFirst({
          where: {
            OR: [
              { shopifyStoreUrl: shopSlug },
              { shopifyStoreUrl: shopDomainNormalized },
              { shopifyStoreUrl: `${shopSlug}.myshopify.com` },
            ],
          },
        });
        if (org) {
          await prisma.webhookEvent.create({
            data: {
              organizationId: org.id,
              topic: "orders/cancelled",
              payload: {},
              headers: {
                shopDomain,
                webhookId: request.headers.get("X-Shopify-Webhook-Id") || null,
                isSelfTest: !!request.headers.get("X-H-Tool-Test-Topic"),
              },
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
