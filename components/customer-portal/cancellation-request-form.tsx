"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ReasonCategory } from "@/lib/customer-portal-types";

interface CancellationRequestFormProps {
  order: any;
  onSubmit: (data: any) => Promise<any>;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CancellationRequestForm({
  order,
  onSubmit,
  onSuccess,
  onCancel,
}: CancellationRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory | "">("" );
  const [reason, setReason] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const reasonCategories: Array<{ value: ReasonCategory; label: string; description: string }> = [
    {
      value: "changed_mind",
      label: "Changed My Mind",
      description: "I no longer need this order",
    },
    {
      value: "found_better_price",
      label: "Found Better Price",
      description: "Found the same product at a lower price",
    },
    {
      value: "ordered_by_mistake",
      label: "Ordered by Mistake",
      description: "I accidentally placed this order",
    },
    {
      value: "delivery_delay",
      label: "Delivery Delay",
      description: "Order is taking too long to arrive",
    },
    {
      value: "product_issue",
      label: "Product Issue",
      description: "Concerns about the product",
    },
    {
      value: "other",
      label: "Other",
      description: "Other reason",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reasonCategory) {
      toast.error("Please select a reason category", {
        position: "bottom-left",
      });
      return;
    }

    if (!reason) {
      toast.error("Please provide a reason for cancellation", {
        position: "bottom-left",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit({
        orderId: order.id,
        reasonCategory,
        reason,
        customerNotes: customerNotes || undefined,
        refundPreference: "full",
      });

      if (result.success) {
        toast.success("Cancellation request submitted successfully", {
          position: "bottom-left",
        });
        onSuccess();
      } else {
        toast.error(result.error || "Failed to submit request", {
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
    <div className="space-y-6">
      <div>
        <Button variant="outline" onClick={onCancel} size="sm">
          ← Back to Order
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Order Cancellation</CardTitle>
          <CardDescription>
            Order #{order.orderNumber} • {order.lineItems.length} item(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason Category Selection */}
            <div className="space-y-3">
              <Label>Reason for Cancellation *</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {reasonCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setReasonCategory(cat.value)}
                    className={`flex flex-col items-start rounded-lg border-2 p-4 text-left transition-colors ${
                      reasonCategory === cat.value
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <div className="font-semibold">{cat.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {cat.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Please explain your reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide more details about why you want to cancel this order..."
                rows={4}
                required
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Any other information you'd like to share..."
                rows={3}
              />
            </div>

            {/* Refund Information */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
              <div className="font-semibold text-emerald-900 dark:text-emerald-400">
                Refund Information
              </div>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                If your cancellation is approved, you will receive a full refund to
                your original payment method. Refunds typically process within 5-7
                business days.
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

