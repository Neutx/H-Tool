"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface RefundDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund: any | null;
}

export function RefundDetailsDrawer({
  open,
  onOpenChange,
  refund,
}: RefundDetailsDrawerProps) {
  if (!refund) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "warning", label: "Pending" },
      processing: { variant: "warning", label: "Processing" },
      completed: { variant: "success", label: "Completed" },
      failed: { variant: "error", label: "Failed" },
    };
    return variants[status] || { variant: "secondary", label: status };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Refund Details</DialogTitle>
          <DialogDescription>
            Order #{refund.order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto py-4">
          {/* Status */}
          <div>
            <Badge {...getStatusBadge(refund.status)}>
              {getStatusBadge(refund.status).label}
            </Badge>
          </div>

          {/* Refund Information */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Refund Information</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund Amount:</span>
                <span className="text-lg font-bold text-emerald-600">
                  {formatCurrency(
                    refund.refundAmount,
                    refund.order?.currency || "INR"
                  )}
                </span>
              </div>
              {refund.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Amount:</span>
                  <span>
                    {formatCurrency(
                      refund.taxAmount,
                      refund.order?.currency || "INR"
                    )}
                  </span>
                </div>
              )}
              {refund.shippingAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span>
                    {formatCurrency(
                      refund.shippingAmount,
                      refund.order?.currency || "INR"
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Processor:</span>
                <span className="capitalize">{refund.paymentProcessor || "N/A"}</span>
              </div>
              {refund.shopifyRefundId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shopify Refund ID:</span>
                  <span className="font-mono text-xs">{refund.shopifyRefundId}</span>
                </div>
              )}
              {refund.transactionId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-xs">{refund.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested:</span>
                <span>{formatDateTime(refund.createdAt)}</span>
              </div>
              {refund.processedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processed:</span>
                  <span>{formatDateTime(refund.processedAt)}</span>
                </div>
              )}
              {refund.lastRetryAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Retry:</span>
                  <span>{formatDateTime(refund.lastRetryAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Order Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-medium">{refund.order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span>
                  {refund.order.customer.name || refund.order.customer.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Total:</span>
                <span className="font-medium">
                  {formatCurrency(
                    refund.order.totalAmount,
                    refund.order?.currency || "INR"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date:</span>
                <span>{formatDateTime(refund.order.orderDate)}</span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Order Items</h3>
            <div className="space-y-2">
              {refund.order.lineItems.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.title} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      item.totalPrice,
                      refund.order?.currency || "INR"
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Information */}
          {refund.status === "failed" && refund.errorMessage && (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
              <h3 className="font-semibold text-red-900 dark:text-red-400">
                Error Information
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300">
                {refund.errorMessage}
              </p>
              {refund.errorCode && (
                <p className="text-xs font-mono text-red-700 dark:text-red-400">
                  Code: {refund.errorCode}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Retry attempts: {refund.retryAttempts}
              </p>
            </div>
          )}

          {/* Shopify Sync Details */}
          {refund.syncedFromShopify && (
            <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
              <h3 className="font-semibold text-blue-900 dark:text-blue-400">
                Synced from Shopify
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shopify Refund ID:</span>
                  <span className="font-mono text-xs">{refund.shopifyRefundId}</span>
                </div>
                {refund.shopifyNote && (
                  <div>
                    <span className="text-muted-foreground">Note:</span>
                    <p className="mt-1">{refund.shopifyNote}</p>
                  </div>
                )}
                {refund.productNames && (
                  <div>
                    <span className="text-muted-foreground">Products:</span>
                    <p className="mt-1">{refund.productNames}</p>
                  </div>
                )}
                {refund.shopifySyncedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Synced:</span>
                    <span>{formatDateTime(refund.shopifySyncedAt)}</span>
                  </div>
                )}
                {refund.shopifyCreatedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created in Shopify:</span>
                    <span>{formatDateTime(refund.shopifyCreatedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cancellation Record */}
          {refund.cancellationRecord && (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">Cancellation Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Reason: </span>
                  <span>{refund.cancellationRecord.reason}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  <Badge variant="secondary">
                    {refund.cancellationRecord.reasonCategory}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Initiated By: </span>
                  <span className="capitalize">
                    {refund.cancellationRecord.initiatedBy}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

