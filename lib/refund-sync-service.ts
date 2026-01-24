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
  diagnostics: string[];
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
    diagnostics: [],
  };

  try {
    // Get sync state for incremental sync
    let syncState = await prisma.syncState.findUnique({
      where: { organizationId },
    });

    if (!syncState) {
      syncState = await prisma.syncState.create({
        data: { organizationId },
      });
      result.diagnostics.push("[Sync] Created new SyncState record");
    }

    const lastSyncAt = syncState.lastRefundSyncAt || undefined;
    if (lastSyncAt) {
      result.diagnostics.push(`[Sync] Using incremental sync from ${lastSyncAt.toISOString()}`);
    } else {
      result.diagnostics.push("[Sync] First sync - fetching all refunds");
    }

    // Fetch refunds from Shopify using filtered endpoint
    const shopifyResponse = await shopify.getRefunds(lastSyncAt, limit);

    if (!shopifyResponse.success) {
      // Preserve Shopify API error message
      const errorMsg = (shopifyResponse as { success: false; error?: string }).error || "Unknown Shopify API error";
      result.success = false;
      result.errors.push(`Shopify API error: ${errorMsg}`);
      result.diagnostics.push(`[Shopify] Failed to fetch refunds: ${errorMsg}`);
      console.error("Shopify API error during refund sync:", errorMsg);
      return result;
    }

    if (!shopifyResponse.data) {
      result.success = false;
      result.errors.push("No data returned from Shopify API");
      result.diagnostics.push("[Shopify] API returned success but no data");
      console.error("Shopify API returned success but no data");
      return result;
    }

    // Handle both direct refunds endpoint and fallback order-scanning format
    let refunds: any[] = [];
    
    if ("refunds" in shopifyResponse.data && Array.isArray(shopifyResponse.data.refunds)) {
      // Direct /refunds.json endpoint response
      refunds = shopifyResponse.data.refunds.map((refund: any) => ({
        id: refund.id,
        createdAt: refund.created_at,
        note: refund.note || null,
        orderId: refund.order_id,
        transactions: refund.transactions || [],
        refund_line_items: refund.refund_line_items || [],
      }));
    } else if ("refunds" in shopifyResponse.data && shopifyResponse.data.refunds?.edges) {
      // Fallback: order-scanning format (from getRecentRefunds)
      refunds = shopifyResponse.data.refunds.edges.map((edge: any) => edge.node);
    }
    
    // If no refunds found, this is still success (just means no refunds exist in Shopify)
    if (refunds.length === 0) {
      result.success = true;
      result.diagnostics.push("[Refund Sync] No refunds found in Shopify");
      // Update sync state even if no data
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastRefundSyncAt: new Date() },
      });
      return result;
    }
    
    result.diagnostics.push(`[Refund Sync] Found ${refunds.length} refund(s) to sync from Shopify`);

    for (const refund of refunds) {
      try {

        // Extract refund amount from transactions
        const refundAmount = refund.transactions?.reduce(
          (sum: number, txn: any) => sum + parseFloat(txn.amount || "0"),
          0
        ) || 0;

        // Get order ID (handle both formats)
        const shopifyOrderId = refund.orderId || refund.order?.id;
        if (!shopifyOrderId) {
          result.diagnostics.push(`[Error] Refund ${refund.id} missing order ID, skipping`);
          continue;
        }

        // Check if refund exists
        const existing = await prisma.refundTransaction.findFirst({
          where: { shopifyRefundId: refund.id },
        });

        // Ensure order exists
        let dbOrder = await prisma.order.findFirst({
          where: { shopifyOrderId },
        });

        if (!dbOrder) {
          result.diagnostics.push(`[Sync] Order ${shopifyOrderId} not found in DB, skipping refund`);
          continue;
        }

        const refundData: any = {
          shopifyRefundId: refund.id,
          shopifyOrderId,
          refundAmount,
          status: mapShopifyStatus(refund.transactions?.[0]?.status || "pending"),
          shopifySyncedAt: new Date(),
          shopifyCreatedAt: refund.createdAt ? new Date(refund.createdAt) : null,
          shopifyNote: refund.note || null,
          refundLineItems: refund.refund_line_items ? JSON.stringify(refund.refund_line_items) : null,
          syncedFromShopify: true,
          paymentProcessor: refund.transactions?.[0]?.gateway || null,
          transactionId: refund.transactions?.[0]?.id || null,
          processedAt: refund.transactions?.[0]?.processed_at
            ? new Date(refund.transactions[0].processed_at)
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
          // Find or create a cancellation record placeholder if needed
          let cancellationRecord = await prisma.cancellationRecord.findFirst({
            where: { orderId: dbOrder.id },
          });

          if (!cancellationRecord) {
            // Create a minimal cancellation record for synced refunds
            const cancellationRequest = await prisma.cancellationRequest.create({
              data: {
                orderId: dbOrder.id,
                customerId: dbOrder.customerId,
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
                orderId: dbOrder.id,
                customerId: dbOrder.customerId,
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
              orderId: dbOrder.id,
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
        result.diagnostics.push(`[Error] Failed to sync refund ${refund.id}: ${errorMsg}`);
      }
    }

    // Update sync state with latest timestamp
    if (refunds.length > 0) {
      const latestRefund = refunds.reduce((latest, refund) => {
        const refundDate = refund.createdAt ? new Date(refund.createdAt) : new Date();
        return refundDate > latest ? refundDate : latest;
      }, new Date(0));

      await prisma.syncState.update({
        where: { organizationId },
        data: { lastRefundSyncAt: latestRefund },
      });

      result.diagnostics.push(`[Sync] Updated sync cursor to ${latestRefund.toISOString()}`);
    } else {
      // No new refunds, just update timestamp
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastRefundSyncAt: new Date() },
      });
    }

    result.diagnostics.push(`[Sync] Completed: ${result.syncedCount} total, ${result.newCount} new, ${result.updatedCount} updated`);
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    result.diagnostics.push(`[Error] Sync failed: ${errorMsg}`);
    console.error("Error in refund sync:", error);
  }

  return result;
}

function mapShopifyStatus(status: string | undefined): string {
  if (!status) return "pending";
  
  const statusMap: Record<string, string> = {
    success: "completed",
    pending: "pending",
    failure: "failed",
    error: "failed",
  };
  return statusMap[status.toLowerCase()] || "pending";
}
