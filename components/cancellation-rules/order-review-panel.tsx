"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  approveCancellation,
  denyCancellation,
  requestInfo,
  escalateReview,
} from "@/app/actions/review-queue";
import { toast } from "sonner";

interface OrderReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  currentUser: string; // TODO: Get from auth context
  onSuccess: () => void;
}

export function OrderReviewPanel({
  open,
  onOpenChange,
  item,
  currentUser,
  onSuccess,
}: OrderReviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  if (!item) return null;

  const handleApprove = async () => {
    setLoading(true);
    const result = await approveCancellation(item.id, currentUser, notes);

    if (result.success) {
      toast.success("Cancellation approved", {
        position: "bottom-left",
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to approve", {
        position: "bottom-left",
      });
    }
    setLoading(false);
  };

  const handleDeny = async () => {
    if (!notes.trim()) {
      toast.error("Please add a reason for denial", {
        position: "bottom-left",
      });
      return;
    }

    setLoading(true);
    const result = await denyCancellation(item.id, currentUser, notes);

    if (result.success) {
      toast.success("Cancellation denied", {
        position: "bottom-left",
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to deny", {
        position: "bottom-left",
      });
    }
    setLoading(false);
  };

  const handleRequestInfo = async () => {
    if (!infoMessage.trim()) {
      toast.error("Please enter a message to customer", {
        position: "bottom-left",
      });
      return;
    }

    setLoading(true);
    const result = await requestInfo(item.id, currentUser, infoMessage);

    if (result.success) {
      toast.success("Information requested from customer", {
        position: "bottom-left",
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to request info", {
        position: "bottom-left",
      });
    }
    setLoading(false);
  };

  const handleEscalate = async () => {
    setLoading(true);
    const result = await escalateReview(item.id, currentUser, notes);

    if (result.success) {
      toast.success("Review escalated to team", {
        position: "bottom-left",
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to escalate", {
        position: "bottom-left",
      });
    }
    setLoading(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      default:
        return "success";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Cancellation Request</DialogTitle>
          <DialogDescription>
            Order #{item.order.orderNumber} - {item.order.customer.name || item.order.customer.email}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto py-4">
          {/* Risk & Status */}
          <div className="flex gap-2">
            <Badge variant={getRiskColor(item.riskLevel)}>
              {item.riskLevel} risk
            </Badge>
            <Badge variant="warning">{item.reviewStatus}</Badge>
            {item.riskIndicators?.riskScore && (
              <Badge variant="secondary">
                Risk Score: {(item.riskIndicators.riskScore * 100).toFixed(0)}%
              </Badge>
            )}
          </div>

          {/* Order Details */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Order Details</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Number:</span>
                <span className="font-medium">{item.order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date:</span>
                <span>{formatDateTime(item.order.orderDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-medium">
                  {formatCurrency(item.order.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary">{item.order.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fulfillment:</span>
                <Badge variant="secondary">{item.order.fulfillmentStatus}</Badge>
              </div>
            </div>
          </div>

          {/* Cancellation Request */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Cancellation Request</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Reason: </span>
                <span className="font-medium">{item.cancellationRequest.reason}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Category: </span>
                <Badge variant="secondary">
                  {item.cancellationRequest.reasonCategory}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Requested: </span>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
              {item.cancellationRequest.notes && (
                <div>
                  <span className="text-muted-foreground">Notes: </span>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">
                    {item.cancellationRequest.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Customer History */}
          {item.customerHistory && (
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">Customer History</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Orders:</span>
                  <p className="text-lg font-semibold">
                    {item.customerHistory.totalOrders || 0}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Cancellations:</span>
                  <p className="text-lg font-semibold">
                    {item.customerHistory.totalCancellations || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">Order Items</h3>
            <div className="space-y-2">
              {item.order.lineItems.map((lineItem: any) => (
                <div
                  key={lineItem.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {lineItem.title} × {lineItem.quantity}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(lineItem.totalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for audit trail..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              onClick={handleDeny}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Deny
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="infoMessage">Request Additional Information</Label>
              <div className="flex gap-2">
                <Textarea
                  id="infoMessage"
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                  placeholder="What information do you need from the customer?"
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleRequestInfo}
                  disabled={loading}
                  variant="outline"
                  className="h-auto"
                >
                  <Info className="mr-2 h-4 w-4" />
                  Request
                </Button>
              </div>
            </div>

            <Button
              onClick={handleEscalate}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Escalate to Team
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

