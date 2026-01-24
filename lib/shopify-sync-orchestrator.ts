/**
 * Shopify Sync Orchestrator
 * Coordinates all sync operations (cancellations, returns, refunds)
 * with rate limiting and proper sequencing
 */

import { syncShopifyCancellations } from "./cancellation-sync-service";
import { syncShopifyReturns } from "./return-sync-service";
import { syncShopifyRefunds } from "./refund-sync-service";

export interface SyncOrchestratorResult {
  success: boolean;
  cancellations: {
    success: boolean;
    syncedCount: number;
    newCount: number;
    updatedCount: number;
    errors: string[];
    diagnostics: string[];
  };
  returns: {
    success: boolean;
    syncedCount: number;
    newCount: number;
    updatedCount: number;
    errors: string[];
    diagnostics: string[];
  };
  refunds: {
    success: boolean;
    syncedCount: number;
    newCount: number;
    updatedCount: number;
    errors: string[];
    diagnostics: string[];
  };
  totalSynced: number;
  totalNew: number;
  totalUpdated: number;
  allErrors: string[];
  allDiagnostics: string[];
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Orchestrate all Shopify sync operations
 * Executes sequentially with delays to respect rate limits
 */
export async function orchestrateShopifySync(
  organizationId: string,
  limit: number = 50
): Promise<SyncOrchestratorResult> {
  const result: SyncOrchestratorResult = {
    success: true,
    cancellations: {
      success: false,
      syncedCount: 0,
      newCount: 0,
      updatedCount: 0,
      errors: [],
      diagnostics: [],
    },
    returns: {
      success: false,
      syncedCount: 0,
      newCount: 0,
      updatedCount: 0,
      errors: [],
      diagnostics: [],
    },
    refunds: {
      success: false,
      syncedCount: 0,
      newCount: 0,
      updatedCount: 0,
      errors: [],
      diagnostics: [],
    },
    totalSynced: 0,
    totalNew: 0,
    totalUpdated: 0,
    allErrors: [],
    allDiagnostics: [],
  };

  try {
    // Sync cancellations
    console.log("[Orchestrator] Starting cancellation sync...");
    result.cancellations = await syncShopifyCancellations(organizationId, limit);
    result.allDiagnostics.push(...result.cancellations.diagnostics);
    result.allErrors.push(...result.cancellations.errors);
    
    // Rate limit: wait 600ms between calls
    await sleep(600);

    // Sync returns
    console.log("[Orchestrator] Starting return sync...");
    result.returns = await syncShopifyReturns(organizationId, limit);
    result.allDiagnostics.push(...result.returns.diagnostics);
    result.allErrors.push(...result.returns.errors);
    
    // Rate limit: wait 600ms between calls
    await sleep(600);

    // Sync refunds
    console.log("[Orchestrator] Starting refund sync...");
    result.refunds = await syncShopifyRefunds(organizationId, limit);
    result.allDiagnostics.push(...result.refunds.diagnostics);
    result.allErrors.push(...result.refunds.errors);

    // Calculate totals
    result.totalSynced =
      result.cancellations.syncedCount +
      result.returns.syncedCount +
      result.refunds.syncedCount;
    result.totalNew =
      result.cancellations.newCount +
      result.returns.newCount +
      result.refunds.newCount;
    result.totalUpdated =
      result.cancellations.updatedCount +
      result.returns.updatedCount +
      result.refunds.updatedCount;

    // Overall success if at least one sync succeeded
    result.success =
      result.cancellations.success ||
      result.returns.success ||
      result.refunds.success;

    result.allDiagnostics.push(
      `[Orchestrator] Completed all syncs: ${result.totalSynced} total items (${result.totalNew} new, ${result.totalUpdated} updated)`
    );

    console.log(
      `[Orchestrator] Sync completed: ${result.totalSynced} items synced`
    );
  } catch (error) {
    result.success = false;
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.allErrors.push(`Orchestrator error: ${errorMsg}`);
    result.allDiagnostics.push(`[Error] Orchestrator failed: ${errorMsg}`);
    console.error("Error in sync orchestrator:", error);
  }

  return result;
}
