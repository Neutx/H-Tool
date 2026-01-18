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
import { toast } from "sonner";

interface ManualRestockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null;
  onRestock: (data: any) => Promise<any>;
  onSuccess: () => void;
}

export function ManualRestockModal({
  open,
  onOpenChange,
  product,
  onRestock,
  onSuccess,
}: ManualRestockModalProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0", {
        position: "bottom-left",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onRestock({
        productId: product.id,
        quantity,
        reason,
        notes,
      });

      if (result.success) {
        toast.success("Stock updated successfully", {
          position: "bottom-left",
        });
        onSuccess();
        onOpenChange(false);
        // Reset form
        setQuantity(0);
        setReason("");
        setNotes("");
      } else {
        toast.error(result.error || "Failed to update stock", {
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

  const newStockLevel = product.stockLevel + quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manual Restock</DialogTitle>
          <DialogDescription>
            Add stock for {product.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Current Stock Info */}
          <div className="rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current Stock:</span>
                <div className="text-2xl font-bold">{product.stockLevel}</div>
              </div>
              <div>
                <span className="text-muted-foreground">New Stock:</span>
                <div className="text-2xl font-bold text-emerald-600">
                  {newStockLevel}
                </div>
              </div>
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Add *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity || ""}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
              required
            />
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., New shipment arrived"
            />
          </div>

          {/* Notes Textarea */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this restock"
              rows={3}
            />
          </div>

          {/* Restock Rule Info */}
          {product.restockRule && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-900/20">
              <div className="font-semibold text-emerald-900 dark:text-emerald-400">
                Auto-Restock Rule Active
              </div>
              <div className="mt-1 text-emerald-800 dark:text-emerald-300">
                Min threshold: {product.restockRule.minThreshold} units
                {product.restockRule.maxStockLevel && (
                  <> • Max: {product.restockRule.maxStockLevel} units</>
                )}
              </div>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || quantity <= 0}>
            {loading ? "Processing..." : "Add Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

