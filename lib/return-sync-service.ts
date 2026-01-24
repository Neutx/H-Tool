/**
 * Return Synchronization Service
 * Handles fetching returns from Shopify Returns API and storing in database
 * Uses filtered API endpoint for efficient syncing
 */

import { shopify } from "./shopify";
import { prisma } from "./prisma";

export interface ReturnSyncResult {
  success: boolean;
  syncedCount: number;
  newCount: number;
  updatedCount: number;
  errors: string[];
  diagnostics: string[];
}

export async function syncShopifyReturns(
  organizationId: string,
  limit: number = 50
): Promise<ReturnSyncResult> {
  const result: ReturnSyncResult = {
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

    const lastSyncAt = syncState.lastReturnSyncAt || undefined;
    if (lastSyncAt) {
      result.diagnostics.push(`[Sync] Using incremental sync from ${lastSyncAt.toISOString()}`);
    } else {
      result.diagnostics.push("[Sync] First sync - fetching all returns");
    }

    // Fetch returns from Shopify Returns API
    const shopifyResponse = await shopify.getReturns(lastSyncAt, limit);

    if (!shopifyResponse.success) {
      const errorMsg = (shopifyResponse as { success: false; error?: string }).error || "Unknown Shopify API error";
      result.success = false;
      result.errors.push(`Shopify API error: ${errorMsg}`);
      result.diagnostics.push(`[Shopify] Failed to fetch returns: ${errorMsg}`);
      console.error("Shopify API error during return sync:", errorMsg);
      return result;
    }

    if (!shopifyResponse.data || !shopifyResponse.data.returns) {
      result.diagnostics.push("[Shopify] No returns returned from API");
      // Update sync state even if no data
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastReturnSyncAt: new Date() },
      });
      return result;
    }

    const returns = shopifyResponse.data.returns;
    result.diagnostics.push(`[Shopify] Fetched ${returns.length} return(s)`);

    if (returns.length === 0) {
      result.diagnostics.push("[Sync] No new returns found");
      // Update sync state
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastReturnSyncAt: new Date() },
      });
      return result;
    }

    // Process each return
    for (const shopifyReturn of returns) {
      try {
        // Ensure order exists in our DB
        let dbOrder = await prisma.order.findFirst({
          where: { shopifyOrderId: shopifyReturn.order_id },
        });

        if (!dbOrder) {
          result.diagnostics.push(`[Sync] Order ${shopifyReturn.order_id} not found in DB, skipping return`);
          continue;
        }

        // Check if return already exists
        const existing = await prisma.shopifyReturn.findUnique({
          where: { shopifyReturnId: shopifyReturn.id },
          include: { lineItems: true },
        });

        const requestedAt = new Date(shopifyReturn.created_at);
        const receivedAt = shopifyReturn.received_at ? new Date(shopifyReturn.received_at) : null;

        if (existing) {
          // Update existing return
          await prisma.shopifyReturn.update({
            where: { id: existing.id },
            data: {
              status: shopifyReturn.status,
              requestedAt,
              receivedAt,
            },
          });

          // Update line items if changed
          // For simplicity, we'll recreate them (could be optimized)
          await prisma.shopifyReturnLineItem.deleteMany({
            where: { returnId: existing.id },
          });

          for (const lineItem of shopifyReturn.return_line_items) {
            await prisma.shopifyReturnLineItem.create({
              data: {
                shopifyLineItemId: lineItem.line_item_id,
                quantity: lineItem.quantity,
                reason: lineItem.reason || null,
                returnId: existing.id,
              },
            });
          }

          result.updatedCount++;
        } else {
          // Create new return
          const newReturn = await prisma.shopifyReturn.create({
            data: {
              shopifyReturnId: shopifyReturn.id,
              shopifyOrderId: shopifyReturn.order_id,
              status: shopifyReturn.status,
              requestedAt,
              receivedAt,
            },
          });

          // Create line items
          for (const lineItem of shopifyReturn.return_line_items) {
            await prisma.shopifyReturnLineItem.create({
              data: {
                shopifyLineItemId: lineItem.line_item_id,
                quantity: lineItem.quantity,
                reason: lineItem.reason || null,
                returnId: newReturn.id,
              },
            });
          }

          result.newCount++;
        }

        result.syncedCount++;
      } catch (itemError) {
        const errorMsg = itemError instanceof Error ? itemError.message : String(itemError);
        result.errors.push(`Error syncing return ${shopifyReturn.id}: ${errorMsg}`);
        result.diagnostics.push(`[Error] Failed to sync return ${shopifyReturn.id}: ${errorMsg}`);
      }
    }

    // Update sync state with latest timestamp
    if (returns.length > 0) {
      const latestReturn = returns.reduce((latest, ret) => {
        const returnDate = new Date(ret.created_at);
        return returnDate > latest ? returnDate : latest;
      }, new Date(0));

      await prisma.syncState.update({
        where: { organizationId },
        data: { lastReturnSyncAt: latestReturn },
      });

      result.diagnostics.push(`[Sync] Updated sync cursor to ${latestReturn.toISOString()}`);
    } else {
      // No new returns, just update timestamp
      await prisma.syncState.update({
        where: { organizationId },
        data: { lastReturnSyncAt: new Date() },
      });
    }

    result.diagnostics.push(`[Sync] Completed: ${result.syncedCount} total, ${result.newCount} new, ${result.updatedCount} updated`);
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(errorMsg);
    result.diagnostics.push(`[Error] Sync failed: ${errorMsg}`);
    console.error("Error in return sync:", error);
  }

  return result;
}
