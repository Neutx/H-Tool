"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ProcessRefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  cancellationRequestId: string;
  onSuccess: () => void;
  onProcess: (data: any) => Promise<any>;
}

export function ProcessRefundModal({
  open,
  onOpenChange,
  order,
  cancellationRequestId,
  onSuccess,
  onProcess,
}: ProcessRefundModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [refundType, setRefundType] = useState<"full" | "partial" | "none">("full");
  const [customAmount, setCustomAmount] = useState(order?.totalAmount || 0);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  if (!order) return null;

  const handleSelectItem = (lineItemId: string, quantity: number) => {
    const newSelected = new Map(selectedItems);
    if (quantity > 0) {
      newSelected.set(lineItemId, quantity);
    } else {
      newSelected.delete(lineItemId);
    }
    setSelectedItems(newSelected);
  };

  const calculateTotal = () => {
    if (refundType === "full") {
      return order.totalAmount;
    }
    if (refundType === "none") {
      return 0;
    }
    if (refundType === "partial") {
      let total = 0;
      selectedItems.forEach((quantity, lineItemId) => {
        const item = order.lineItems.find((li: any) => li.id === lineItemId);
        if (item) {
          total += item.price * quantity;
        }
      });
      return total;
    }
    return customAmount;
  };

  const handleNext = () => {
    if (step === 1) {
      if (refundType === "partial" && selectedItems.size === 0) {
        toast.error("Please select at least one item for partial refund", {
          position: "bottom-left",
        });
        return;
      }
      setStep(2);
    }
  };

  const handleProcess = async () => {
    setLoading(true);
    try {
      const data = {
        cancellationRequestId,
        orderId: order.id,
        refundType,
        ...(refundType === "partial" && {
          selectedItems: Array.from(selectedItems.entries()).map(
            ([lineItemId, quantity]) => ({ lineItemId, quantity })
          ),
        }),
        ...(refundType !== "full" &&
          refundType !== "none" && { customAmount }),
      };

      const result = await onProcess(data);

      if (result.success) {
        toast.success("Refund processed successfully", {
          position: "bottom-left",
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to process refund", {
          position: "bottom-left",
        });
      }
    } catch (error) {
      toast.error("An error occurred", {
        position: "bottom-left",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Process Refund - Order #{order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 2: {step === 1 ? "Select refund type" : "Review and confirm"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            {/* Refund Type Selection */}
            <div className="space-y-3">
              <Label>Refund Type</Label>

              <div className="space-y-2">
                <button
                  onClick={() => setRefundType("full")}
                  className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition-colors ${
                    refundType === "full"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-semibold">Full Refund</div>
                    <div className="text-sm text-muted-foreground">
                      Refund entire order amount
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(order.totalAmount, order.currency || "INR")}
                  </div>
                </button>

                <button
                  onClick={() => setRefundType("partial")}
                  className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition-colors ${
                    refundType === "partial"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-semibold">Partial Refund</div>
                    <div className="text-sm text-muted-foreground">
                      Refund specific items
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setRefundType("none")}
                  className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition-colors ${
                    refundType === "none"
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-semibold">No Refund</div>
                    <div className="text-sm text-muted-foreground">
                      Cancel order without refund
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(0, order.currency || "INR")}
                  </div>
                </button>
              </div>
            </div>

            {/* Item Selection for Partial Refund */}
            {refundType === "partial" && (
              <div className="space-y-3 rounded-lg border p-4">
                <Label>Select Items to Refund</Label>
                <div className="space-y-2">
                  {order.lineItems.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(item.price, order.currency || "INR")} × {item.quantity} ={" "}
                          {formatCurrency(item.totalPrice, order.currency || "INR")}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={selectedItems.get(item.id) || 0}
                        onChange={(e) =>
                          handleSelectItem(item.id, parseInt(e.target.value) || 0)
                        }
                        className="w-20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Review */}
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Number:</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span>{order.customer.name || order.customer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refund Type:</span>
                  <Badge variant="secondary">{refundType}</Badge>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Refund Amount:</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(calculateTotal(), order.currency || "INR")}
                  </span>
                </div>
              </div>
            </div>

            {refundType === "partial" && selectedItems.size > 0 && (
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold">Items to Refund</h3>
                <div className="space-y-2">
                  {Array.from(selectedItems.entries()).map(([lineItemId, quantity]) => {
                    const item = order.lineItems.find((li: any) => li.id === lineItemId);
                    if (!item) return null;
                    return (
                      <div key={lineItemId} className="flex justify-between text-sm">
                        <span>
                          {item.title} × {quantity}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.price * quantity, order.currency || "INR")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext}>Next</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleProcess} disabled={loading}>
                {loading ? "Processing..." : "Process Refund"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

