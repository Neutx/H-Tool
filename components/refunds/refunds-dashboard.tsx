"use client";

import { TrendingUp, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { RefundTransaction } from "@/lib/types";

interface RefundsDashboardProps {
  refunds: RefundTransaction[];
  metrics: {
    totalRefunds: number;
    pendingRefunds: number;
    completedRefunds: number;
    failedRefunds: number;
    totalRefunded: number;
    successRate: number;
  };
  onProcessRefund: (orderId: string) => void;
  onViewDetails: (refundId: string) => void;
  onRetryRefund: (refundId: string) => void;
  onSyncRefunds?: () => void;
  isSyncing?: boolean;
}

export function RefundsDashboard({
  refunds,
  metrics,
  onViewDetails,
  onRetryRefund,
  onSyncRefunds,
  isSyncing = false,
}: RefundsDashboardProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "warning" | "error" | "secondary" | "success" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "warning", label: "Pending" },
      processing: { variant: "warning", label: "Processing" },
      completed: { variant: "success", label: "Completed" },
      failed: { variant: "error", label: "Failed" },
    };
    return variants[status] || { variant: "secondary" as const, label: status };
  };

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      {onSyncRefunds && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Refunds Overview</h2>
            <p className="text-sm text-muted-foreground">
              View and manage all refund transactions
            </p>
          </div>
          <Button
            onClick={onSyncRefunds}
            disabled={isSyncing}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            Sync Recent Returns
          </Button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <span className="text-lg font-semibold text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRefunds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingRefunds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.completedRefunds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failedRefunds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Total Refunded Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Refunded Amount</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-emerald-600">
            {formatCurrency(metrics.totalRefunded, "INR")}
          </div>
        </CardContent>
      </Card>

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Refunds</CardTitle>
        </CardHeader>
        <CardContent>
          {refunds.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No refunds processed yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        Order #{refund.order.orderNumber}
                      </span>
                      {(() => {
                        const statusBadge = getStatusBadge(refund.status);
                        return (
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground flex-wrap items-center">
                      <span>{refund.order.customerId || "Unknown Customer"}</span>
                      <span>•</span>
                      {refund.productNames && (
                        <>
                          <span
                            className="truncate max-w-[200px]"
                            title={refund.productNames}
                          >
                            {refund.productNames}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>
                        {formatDateTime(
                          refund.shopifyCreatedAt || refund.createdAt
                        )}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(
                          refund.refundAmount,
                          refund.order?.currency || "INR"
                        )}
                      </span>
                      {refund.syncedFromShopify && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs">
                            Synced
                          </Badge>
                        </>
                      )}
                    </div>
                    {refund.errorMessage && (
                      <p className="text-sm text-red-600">
                        Error: {refund.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {refund.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetryRefund(refund.id)}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewDetails(refund.id)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

