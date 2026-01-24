/**
 * Cancellation Synchronization Service
 * Handles fetching cancelled orders from Shopify and storing in database
 * Uses filtered API endpoint for efficient syncing
 */

import { shopify } from "./shopify";
import { prisma } from "./prisma";

export interface CancellationSyncResult {
  success: boolean;
  syncedCount: number;
  newCount: number;
  updatedCount: number;
  errors: string[];
  diagnostics: string[];
}

export async function syncShopifyCancellations(
  organizationId: string,
  limit: number = 50
): Promise<CancellationSyncResult> {
  const result: CancellationSyncResult = {
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

    const lastSyncAt = syncState.lastCancellationSyncAt || undefined;
    if (lastSyncAt) {
      result.diagnostics.push(`[Sync] Using incremental sync from ${lastSyncAt.toISOString()}`);
    } else {
      result.diagnostics.push("[Sync] First sync - fetching all cancellations");
    }

    // Fetch cancelled orders from Shopify using filtered endpoint
    const shopifyResponse = await shopify.getCancelledOrders(lastSyncAt, limit);

    if (!shopifyResponse.success) {
      const errorMsg = (shopifyResponse as { success: false; error?: string }).error || "Unknown Shopify API error";
      result.success = false;
      result.errors.push(`Shopify API error: ${errorMsg}`);
      result.diagnostics.push(`[Shopify] Failed to fetch cancelled orders: ${errorMsg}`);
      console.error("Shopify API error during cancellation sync:", errorMsg);
      return result;
    }

    if (!shopifyResponse.data || !shopifyResponse.data.orders) {
      result.diagnostics.push("[Shopify] No cancelled orders returned from API");
      // Update sync state even if no data (prevents re-scanning)
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastCancellationSyncAt: new Date() },
      });
      return result;
    }

    const cancelledOrders = shopifyResponse.data.orders;
    result.diagnostics.push(`[Shopify] Fetched ${cancelledOrders.length} cancelled order(s)`);

    if (cancelledOrders.length === 0) {
      result.diagnostics.push("[Sync] No new cancellations found");
      // Update sync state
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastCancellationSyncAt: new Date() },
      });
      return result;
    }

    // Process each cancelled order
    for (const order of cancelledOrders) {
      try {
        // Ensure order exists in our DB first
        let dbOrder = await prisma.order.findFirst({
          where: { shopifyOrderId: order.id },
        });

        if (!dbOrder) {
          // Order doesn't exist, we need to create it
          // This requires customer and organization data
          // For now, skip if order doesn't exist (could be enhanced later)
          result.diagnostics.push(`[Sync] Order ${order.id} not found in DB, skipping cancellation`);
          continue;
        }

        // Check if cancellation already exists
        const existing = await prisma.shopifyCancellation.findUnique({
          where: { shopifyCancellationId: order.id },
        });

        const cancelledAt = new Date(order.cancelled_at);

        if (existing) {
          // Update existing cancellation
          await prisma.shopifyCancellation.update({
            where: { id: existing.id },
            data: {
              cancelledAt,
              cancelReason: order.cancel_reason || null,
            },
          });

          // Update order fields
          await prisma.order.update({
            where: { id: dbOrder.id },
            data: {
              cancelledAt,
              cancelReason: order.cancel_reason || null,
            },
          });

          result.updatedCount++;
        } else {
          // Create new cancellation
          await prisma.shopifyCancellation.create({
            data: {
              shopifyCancellationId: order.id,
              shopifyOrderId: order.id,
              cancelledAt,
              cancelReason: order.cancel_reason || null,
            },
          });

          // Update order fields
          await prisma.order.update({
            where: { id: dbOrder.id },
            data: {
              cancelledAt,
              cancelReason: order.cancel_reason || null,
            },
          });

          result.newCount++;
        }

        result.syncedCount++;
      } catch (itemError) {
        const errorMsg = itemError instanceof Error ? itemError.message : String(itemError);
        result.errors.push(`Error syncing cancellation for order ${order.id}: ${errorMsg}`);
        result.diagnostics.push(`[Error] Failed to sync order ${order.id}: ${errorMsg}`);
      }
    }

    // Update sync state with latest timestamp
    if (cancelledOrders.length > 0) {
      const latestCancellation = cancelledOrders.reduce((latest, order) => {
        const orderDate = new Date(order.cancelled_at);
        return orderDate > latest ? orderDate : latest;
      }, new Date(0));

      await prisma.syncState.update({
        where: { organizationId },
        data: { lastCancellationSyncAt: latestCancellation },
      });

      result.diagnostics.push(`[Sync] Updated sync cursor to ${latestCancellation.toISOString()}`);
    } else {
      // No new cancellations, just update timestamp
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastCancellationSyncAt: new Date() },
      });
    }

    result.diagnostics.push(`[Sync] Completed: ${result.syncedCount} total, ${result.newCount} new, ${result.updatedCount} updated`);
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    result.diagnostics.push(`[Error] Sync failed: ${errorMsg}`);
    console.error("Error in cancellation sync:", error);
  }

  return result;
}
