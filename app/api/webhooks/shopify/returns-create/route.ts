import { NextRequest, NextResponse } from "next/server";
import { parseWebhookPayload, respondToWebhook, respondToWebhookError } from "@/lib/shopify-webhook-utils";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime (Prisma requires Node.js)
export const runtime = "nodejs";

/**
 * Handle returns/create webhook from Shopify
 * Shopify sends this when a return is created
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and verify webhook payload
    const { payload, isValid } = await parseWebhookPayload<{
      id: string;
      order_id: string;
      status: string;
      created_at: string;
      received_at: string | null;
      return_line_items: Array<{
        id: string;
        line_item_id: string;
        quantity: number;
        reason: string | null;
      }>;
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

    // Ensure order exists
    const order = await prisma.order.findFirst({
      where: { shopifyOrderId: payload.order_id },
    });

    if (!order) {
      console.warn(`[Webhook] Order ${payload.order_id} not found in DB, skipping return`);
      // Still return 200 to Shopify (don't retry)
      return respondToWebhook();
    }

    const returnId = payload.id.toString();
    const requestedAt = new Date(payload.created_at);
    const receivedAt = payload.received_at ? new Date(payload.received_at) : null;

    // Upsert return (idempotent)
    const shopifyReturn = await prisma.shopifyReturn.upsert({
      where: { shopifyReturnId: returnId },
      update: {
        status: payload.status,
        requestedAt,
        receivedAt,
      },
      create: {
        shopifyReturnId: returnId,
        shopifyOrderId: payload.order_id,
        status: payload.status,
        requestedAt,
        receivedAt,
      },
    });

    // Delete existing line items and recreate (simplified approach)
    await prisma.shopifyReturnLineItem.deleteMany({
      where: { returnId: shopifyReturn.id },
    });

    // Create line items
    for (const lineItem of payload.return_line_items) {
      await prisma.shopifyReturnLineItem.create({
        data: {
          shopifyLineItemId: lineItem.line_item_id,
          quantity: lineItem.quantity,
          reason: lineItem.reason || null,
          returnId: shopifyReturn.id,
        },
      });
    }

    // Update webhook last triggered timestamp
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "returns/create",
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    console.log(`[Webhook] Processed return creation for return ${returnId}`);
    return respondToWebhook();
  } catch (error) {
    console.error("[Webhook] Error processing returns/create:", error);
    return respondToWebhookError(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
