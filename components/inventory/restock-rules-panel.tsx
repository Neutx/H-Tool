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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { RestockStrategy } from "@/lib/inventory-types";

interface RestockRulesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any | null;
  onSave: (data: any) => Promise<any>;
  onDelete?: (ruleId: string) => Promise<any>;
  onSuccess: () => void;
}

export function RestockRulesPanel({
  open,
  onOpenChange,
  product,
  onSave,
  onDelete,
  onSuccess,
}: RestockRulesPanelProps) {
  const existingRule = product?.restockRule;

  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<RestockStrategy>(
    existingRule?.strategy || "auto_restock"
  );
  const [minThreshold, setMinThreshold] = useState(
    existingRule?.minThreshold || 10
  );
  const [restockQuantity, setRestockQuantity] = useState(
    existingRule?.restockQuantity || 50
  );
  const [maxStockLevel, setMaxStockLevel] = useState(
    existingRule?.maxStockLevel || 0
  );
  const [active, setActive] = useState(existingRule?.active ?? true);
  const [priority, setPriority] = useState(existingRule?.priority || 0);

  if (!product) return null;

  const strategies: Array<{ value: RestockStrategy; label: string; description: string }> = [
    {
      value: "auto_restock",
      label: "Automatic Restock",
      description: "Automatically add stock when threshold is reached",
    },
    {
      value: "manual_review",
      label: "Manual Review",
      description: "Create notification for manual review",
    },
    {
      value: "no_restock",
      label: "No Restock",
      description: "Never restock this product automatically",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (minThreshold < 0) {
      toast.error("Minimum threshold cannot be negative", {
        position: "bottom-left",
      });
      return;
    }

    if (maxStockLevel > 0 && maxStockLevel < minThreshold) {
      toast.error("Max stock level cannot be less than min threshold", {
        position: "bottom-left",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onSave({
        id: existingRule?.id,
        productId: product.id,
        minThreshold,
        restockQuantity,
        maxStockLevel: maxStockLevel > 0 ? maxStockLevel : undefined,
        strategy,
        locationId: "default",
        priority,
      });

      if (result.success) {
        toast.success("Restock rule saved successfully", {
          position: "bottom-left",
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to save rule", {
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

  const handleDelete = async () => {
    if (!existingRule || !onDelete) return;

    if (!confirm("Are you sure you want to delete this restock rule?")) {
      return;
    }

    setLoading(true);
    try {
      const result = await onDelete(existingRule.id);

      if (result.success) {
        toast.success("Restock rule deleted", {
          position: "bottom-left",
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to delete rule", {
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
            {existingRule ? "Edit" : "Create"} Restock Rule
          </DialogTitle>
          <DialogDescription>
            Configure automatic restocking for {product.title}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Current Stock Info */}
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Current Stock Level</div>
            <div className="text-3xl font-bold">{product.stockLevel} units</div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-3">
            <Label>Restock Strategy</Label>
            <div className="space-y-2">
              {strategies.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStrategy(s.value)}
                  className={`flex w-full flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                    strategy === s.value
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-sm text-muted-foreground">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Threshold Configuration */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minThreshold">Minimum Threshold *</Label>
              <Input
                id="minThreshold"
                type="number"
                min="0"
                value={minThreshold}
                onChange={(e) => setMinThreshold(parseInt(e.target.value) || 0)}
                placeholder="e.g., 10"
                required
              />
              <p className="text-xs text-muted-foreground">
                Restock when stock falls to this level
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restockQuantity">Restock Quantity *</Label>
              <Input
                id="restockQuantity"
                type="number"
                min="0"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(parseInt(e.target.value) || 0)}
                placeholder="e.g., 50"
                required
              />
              <p className="text-xs text-muted-foreground">
                How much to restock each time
              </p>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold">Advanced Options</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxStockLevel">Max Stock Level (Optional)</Label>
                <Input
                  id="maxStockLevel"
                  type="number"
                  min="0"
                  value={maxStockLevel || ""}
                  onChange={(e) => setMaxStockLevel(parseInt(e.target.value) || 0)}
                  placeholder="e.g., 200"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum stock to maintain (0 = no limit)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Higher priority rules are evaluated first
                </p>
              </div>
            </div>

            {existingRule && (
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label>Rule Status</Label>
                  <div className="text-sm text-muted-foreground">
                    {active ? "Active and running" : "Inactive (paused)"}
                  </div>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
            <div className="font-semibold text-emerald-900 dark:text-emerald-400">
              Rule Preview
            </div>
            <div className="mt-2 space-y-1 text-sm text-emerald-800 dark:text-emerald-300">
              <p>
                When stock reaches <strong>{minThreshold}</strong> units:
              </p>
              {strategy === "auto_restock" && (
                <p>
                  → Automatically add <strong>{restockQuantity}</strong> units
                  {maxStockLevel > 0 && (
                    <> (max stock: <strong>{maxStockLevel}</strong>)</>
                  )}
                </p>
              )}
              {strategy === "manual_review" && (
                <p>→ Create notification for manual review</p>
              )}
              {strategy === "no_restock" && (
                <p>→ No automatic action (monitoring only)</p>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
          {existingRule && onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="mr-auto"
            >
              Delete Rule
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

