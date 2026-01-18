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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Rule } from "@/lib/types";
import { toast } from "sonner";

interface RuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: Rule | null;
  onSave: (data: any) => Promise<void>;
}

export function RuleForm({ open, onOpenChange, rule, onSave }: RuleFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: rule?.name || "",
    description: rule?.description || "",
    timeWindow: 15,
    action: "auto_approve",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        name: formData.name,
        description: formData.description,
        conditions: {
          timeWindow: formData.timeWindow,
          orderStatus: ["open", "pending"],
          fulfillmentStatus: ["unfulfilled"],
        },
        actions: {
          type: formData.action,
          notifyCustomer: true,
        },
        priority: rule?.priority ?? 0,
        active: true,
      });

      toast.success(rule ? "Rule updated" : "Rule created", {
        position: "bottom-left",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save rule", {
        position: "bottom-left",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{rule ? "Edit Rule" : "Create New Rule"}</DialogTitle>
            <DialogDescription>
              Configure automation rules for cancellation requests
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Auto-approve within 15 min"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this rule does..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeWindow">Time Window (minutes)</Label>
              <Input
                id="timeWindow"
                type="number"
                value={formData.timeWindow}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timeWindow: parseInt(e.target.value),
                  })
                }
                min="1"
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">
                Cancel within X minutes of order placement
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <select
                id="action"
                value={formData.action}
                onChange={(e) =>
                  setFormData({ ...formData, action: e.target.value })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="auto_approve">Auto-approve</option>
                <option value="manual_review">Manual review</option>
                <option value="deny">Deny</option>
                <option value="escalate">Escalate</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

