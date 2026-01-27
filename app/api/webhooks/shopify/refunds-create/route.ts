import { NextRequest, NextResponse } from "next/server";
import { parseWebhookPayload, respondToWebhook, respondToWebhookError } from "@/lib/shopify-webhook-utils";
import { prisma } from "@/lib/prisma";
import { extractShopifyId } from "@/lib/shopify";

// Force Node.js runtime (Prisma requires Node.js)
export const runtime = "nodejs";

/**
 * Handle refunds/create webhook from Shopify
 * Shopify sends this when a refund is created
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and verify webhook payload
    const { payload, isValid } = await parseWebhookPayload<{
      id: string;
      order_id: string;
      created_at: string;
      note: string | null;
      transactions: Array<{
        id: string;
        status: string;
        amount: string;
        gateway: string;
        processed_at: string;
      }>;
      refund_line_items: Array<{
        line_item_id: string;
        quantity: number;
        restock_type: string;
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

    // Update webhook test status
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "refunds/create",
      },
      data: {
        testStatus: "success",
        lastTestedAt: new Date(),
      },
    });

    // Extract and convert order ID to BigInt
    const orderIdNumeric = extractShopifyId(payload.order_id);
    const orderIdBigInt = BigInt(orderIdNumeric);

    // Ensure order exists
    const order = await prisma.order.findFirst({
      where: { shopifyOrderId: orderIdBigInt },
    });

    if (!order) {
      console.warn(`[Webhook] Order ${orderIdNumeric} not found in DB, skipping refund`);
      // Still return 200 to Shopify (don't retry)
      return respondToWebhook();
    }

    // Convert to BigInt (webhook payload may be string from JSON, but we need BigInt for Prisma)
    const refundIdNumeric = extractShopifyId(payload.id);
    const refundId = BigInt(refundIdNumeric);
    
    // Calculate refund amount from transactions
    const refundAmount = payload.transactions.reduce(
      (sum, txn) => sum + parseFloat(txn.amount || "0"),
      0
    );

    // Check if refund already exists
    const existing = await prisma.refundTransaction.findFirst({
      where: { shopifyRefundId: refundId },
    });

    // Find or create cancellation record
    let cancellationRecord = await prisma.cancellationRecord.findFirst({
      where: { orderId: order.id },
    });

    if (!cancellationRecord) {
      // Create a minimal cancellation record for synced refunds
      const cancellationRequest = await prisma.cancellationRequest.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          organizationId: organization.id,
          reason: "Synced from Shopify webhook",
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
          organizationId: organization.id,
          initiatedBy: "system",
          reason: "Synced from Shopify webhook",
          reasonCategory: "other",
          refundAmount,
          refundStatus: payload.transactions[0]?.status === "success" ? "completed" : "pending",
          restockDecision: "no_restock",
          completedAt: new Date(),
        },
      });
    }

    const refundData = {
      shopifyRefundId: refundId,
      shopifyOrderId: orderIdBigInt,
      refundAmount,
      status: payload.transactions[0]?.status === "success" ? "completed" : "pending",
      shopifySyncedAt: new Date(),
      shopifyCreatedAt: new Date(payload.created_at),
      shopifyNote: payload.note || null,
      refundLineItems: JSON.stringify(payload.refund_line_items),
      syncedFromShopify: true,
      paymentProcessor: payload.transactions[0]?.gateway || null,
      transactionId: payload.transactions[0]?.id || null,
      processedAt: payload.transactions[0]?.processed_at
        ? new Date(payload.transactions[0].processed_at)
        : null,
      orderId: order.id,
      cancellationRecordId: cancellationRecord.id,
    };

    if (existing) {
      // Update existing refund
      await prisma.refundTransaction.update({
        where: { id: existing.id },
        data: refundData,
      });
    } else {
      // Create new refund
      await prisma.refundTransaction.create({
        data: refundData,
      });
    }

    // Update webhook last triggered timestamp
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "refunds/create",
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    console.log(`[Webhook] Processed refund creation for refund ${refundId}`);

    // Log webhook event
    await prisma.webhookEvent.create({
      data: {
        organizationId: organization.id,
        topic: "refunds/create",
        payload: payload,
        headers: { shopDomain },
        success: true,
      },
    });

    return respondToWebhook();
  } catch (error) {
    console.error("[Webhook] Error processing refunds/create:", error);
    
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
              topic: "refunds/create",
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
