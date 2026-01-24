"use client";

import { useState, useEffect } from "react";
import { RefundsDashboard } from "@/components/refunds/refunds-dashboard";
import { ProcessRefundModal } from "@/components/refunds/process-refund-modal";
import { RefundDetailsDrawer } from "@/components/refunds/refund-details-drawer";
import {
  getRefunds,
  getRefundMetrics,
  processRefund,
  retryRefund,
  getRefundDetails,
  syncRefundsFromShopify,
} from "@/app/actions/refunds";
import { useOrganization } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { RefundTransaction } from "@/lib/types";

type RefundMetrics = {
  totalRefunds: number;
  pendingRefunds: number;
  completedRefunds: number;
  failedRefunds: number;
  totalRefunded: number;
  successRate: number;
};

export default function RefundsPage() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [refunds, setRefunds] = useState<RefundTransaction[]>([]);
  const [metrics, setMetrics] = useState<RefundMetrics>({
    totalRefunds: 0,
    pendingRefunds: 0,
    completedRefunds: 0,
    failedRefunds: 0,
    totalRefunded: 0,
    successRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modal states
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundTransaction | null>(null);
  const [selectedCancellationRequestId] =
    useState<string>("");

  const loadRefunds = async () => {
    if (!organizationId) return;
    const result = await getRefunds(organizationId);
    if (result.success && result.data) {
      setRefunds(result.data as RefundTransaction[]);
    }
  };

  const loadMetrics = async () => {
    if (!organizationId) return;
    const result = await getRefundMetrics(organizationId);
    if (result.success && result.data) {
      setMetrics(result.data as RefundMetrics);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRefunds(), loadMetrics()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);


  const handleProcessRefund = (orderId: string) => {
    // TODO: Get order details and cancellation request ID
    // For now, this is a placeholder
    console.log("Process refund for order:", orderId);
  };

  const handleViewDetails = async (refundId: string) => {
    const result = await getRefundDetails(refundId);
    if (result.success && result.data) {
      setSelectedRefund(result.data);
      setDetailsDrawerOpen(true);
    }
  };

  const handleRetryRefund = async (refundId: string) => {
    const result = await retryRefund(refundId);
    if (result.success) {
      await loadData();
    }
  };

  const handleSyncRefunds = async () => {
    if (!organizationId) return;
    setIsSyncing(true);
    
    console.log("[UI] Starting refund sync from Shopify...");
    const result = await syncRefundsFromShopify(organizationId);

    // Log diagnostics from server-side processing
    if (result.data && "diagnostics" in result.data && Array.isArray(result.data.diagnostics) && result.data.diagnostics.length > 0) {
      console.group("[Shopify] Server-side diagnostics:");
      result.data.diagnostics.forEach((msg: string) => {
        if (msg.includes("error") || msg.includes("Error") || msg.includes("Failed")) {
          console.error(msg);
        } else if (msg.includes("warn") || msg.includes("Warning")) {
          console.warn(msg);
        } else {
          console.log(msg);
        }
      });
      console.groupEnd();
    }

    if (result.success) {
      const syncedCount = result.data?.syncedCount || 0;
      if (syncedCount === 0) {
        toast.info(
          "No refunds found in Shopify. Check the browser console (F12) for detailed logs. Possible reasons: 1) No refunds exist in your store, 2) Refunds are older than the last 100 orders, 3) Refunds were processed outside Shopify. Verify in Shopify Admin: Orders → Refunds.",
          { position: "bottom-left", duration: 8000 }
        );
        console.log("[UI] Sync completed but no refunds found. See diagnostics above for details.");
      } else {
        toast.success(
          `Synced ${syncedCount} refunds successfully! (${result.data?.newCount || 0} new, ${result.data?.updatedCount || 0} updated)`,
          { position: "bottom-left" }
        );
        console.log(`[UI] Successfully synced ${syncedCount} refunds`);
      }
      await loadData(); // Reload dashboard data
    } else {
      const errorMsg = result.error || "Sync failed";
      const errorDetails = result.data?.errors?.join(", ") || "";
      toast.error(
        errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg,
        { position: "bottom-left", duration: 6000 }
      );
      console.error("[UI] Sync failed:", errorMsg, errorDetails);
    }

    setIsSyncing(false);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading refunds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Refund Management</h1>
        <p className="text-muted-foreground">
          Process refunds and manage payment transactions
        </p>
      </div>

      <RefundsDashboard
        refunds={refunds}
        metrics={metrics}
        onProcessRefund={handleProcessRefund}
        onViewDetails={handleViewDetails}
        onRetryRefund={handleRetryRefund}
        onSyncRefunds={handleSyncRefunds}
        isSyncing={isSyncing}
      />

      {/* Modals */}
      <ProcessRefundModal
        open={processModalOpen}
        onOpenChange={setProcessModalOpen}
        order={null}
        cancellationRequestId={selectedCancellationRequestId}
        onSuccess={loadData}
        onProcess={processRefund}
      />

      <RefundDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        refund={selectedRefund}
      />
    </div>
  );
}
