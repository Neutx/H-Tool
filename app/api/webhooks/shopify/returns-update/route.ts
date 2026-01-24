import { NextRequest, NextResponse } from "next/server";
import { parseWebhookPayload, respondToWebhook, respondToWebhookError } from "@/lib/shopify-webhook-utils";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime (Prisma requires Node.js)
export const runtime = "nodejs";

/**
 * Handle returns/update webhook from Shopify
 * Shopify sends this when a return status is updated
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

    const returnId = payload.id.toString();
    const requestedAt = new Date(payload.created_at);
    const receivedAt = payload.received_at ? new Date(payload.received_at) : null;

    // Update existing return
    const existingReturn = await prisma.shopifyReturn.findUnique({
      where: { shopifyReturnId: returnId },
    });

    if (!existingReturn) {
      // Return doesn't exist, create it (shouldn't happen but handle gracefully)
      console.warn(`[Webhook] Return ${returnId} not found, creating new record`);
      
      const order = await prisma.order.findFirst({
        where: { shopifyOrderId: payload.order_id },
      });

      if (!order) {
        console.warn(`[Webhook] Order ${payload.order_id} not found, skipping`);
        return respondToWebhook();
      }

      const newReturn = await prisma.shopifyReturn.create({
        data: {
          shopifyReturnId: returnId,
          shopifyOrderId: payload.order_id,
          status: payload.status,
          requestedAt,
          receivedAt,
        },
      });

      // Create line items
      for (const lineItem of payload.return_line_items) {
        await prisma.shopifyReturnLineItem.create({
          data: {
            shopifyLineItemId: lineItem.line_item_id,
            quantity: lineItem.quantity,
            reason: lineItem.reason || null,
            returnId: newReturn.id,
          },
        });
      }
    } else {
      // Update existing return
      await prisma.shopifyReturn.update({
        where: { id: existingReturn.id },
        data: {
          status: payload.status,
          requestedAt,
          receivedAt,
        },
      });

      // Update line items if changed
      await prisma.shopifyReturnLineItem.deleteMany({
        where: { returnId: existingReturn.id },
      });

      for (const lineItem of payload.return_line_items) {
        await prisma.shopifyReturnLineItem.create({
          data: {
            shopifyLineItemId: lineItem.line_item_id,
            quantity: lineItem.quantity,
            reason: lineItem.reason || null,
            returnId: existingReturn.id,
          },
        });
      }
    }

    // Update webhook last triggered timestamp
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "returns/update",
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    console.log(`[Webhook] Processed return update for return ${returnId}`);
    return respondToWebhook();
  } catch (error) {
    console.error("[Webhook] Error processing returns/update:", error);
    return respondToWebhookError(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
