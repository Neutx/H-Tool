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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AdjustmentReason } from "@/lib/inventory-types";

interface InventoryAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null;
  onAdjust: (data: any) => Promise<any>;
  onSuccess: () => void;
}

export function InventoryAdjustmentModal({
  open,
  onOpenChange,
  product,
  onAdjust,
  onSuccess,
}: InventoryAdjustmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState<AdjustmentReason>("manual");
  const [notes, setNotes] = useState("");

  if (!product) return null;

  const quantityChange = adjustmentType === "add" ? quantity : -quantity;
  const newStockLevel = Math.max(0, product.stockLevel + quantityChange);

  const reasons: Array<{ value: AdjustmentReason; label: string }> = [
    { value: "manual", label: "Manual Adjustment" },
    { value: "damaged", label: "Damaged" },
    { value: "lost", label: "Lost/Missing" },
    { value: "return", label: "Customer Return" },
    { value: "cancellation", label: "Order Cancellation" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0", {
        position: "bottom-left",
      });
      return;
    }

    if (adjustmentType === "remove" && quantity > product.stockLevel) {
      toast.error("Cannot remove more than current stock", {
        position: "bottom-left",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onAdjust({
        productId: product.id,
        quantityChange,
        reason,
        notes,
      });

      if (result.success) {
        toast.success("Inventory adjusted successfully", {
          position: "bottom-left",
        });
        onSuccess();
        onOpenChange(false);
        // Reset form
        setQuantity(0);
        setReason("manual");
        setNotes("");
      } else {
        toast.error(result.error || "Failed to adjust inventory", {
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
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Inventory Adjustment</DialogTitle>
          <DialogDescription>
            Adjust stock level for {product.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Stock Info */}
          <div className="rounded-lg border p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current:</span>
                <div className="text-xl font-bold">{product.stockLevel}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Change:</span>
                <div
                  className={`text-xl font-bold ${
                    adjustmentType === "add"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {adjustmentType === "add" ? "+" : "-"}
                  {quantity}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">New:</span>
                <div className="text-xl font-bold">{newStockLevel}</div>
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("add")}
                className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
                  adjustmentType === "add"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                }`}
              >
                <div className="font-semibold text-emerald-600">Add Stock</div>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("remove")}
                className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
                  adjustmentType === "remove"
                    ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                }`}
              >
                <div className="font-semibold text-red-600">Remove Stock</div>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={adjustmentType === "remove" ? product.stockLevel : undefined}
              value={quantity || ""}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <div className="flex flex-wrap gap-2">
              {reasons.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className="flex-1 min-w-[120px]"
                >
                  <Badge
                    variant={reason === r.value ? "default" : "secondary"}
                    className="w-full cursor-pointer"
                  >
                    {r.label}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes *</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain the reason for this adjustment"
              rows={3}
              required
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || quantity <= 0}
            variant={adjustmentType === "remove" ? "destructive" : "default"}
          >
            {loading
              ? "Processing..."
              : adjustmentType === "add"
              ? "Add Stock"
              : "Remove Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

