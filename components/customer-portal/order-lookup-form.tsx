"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { CustomerOrder } from "@/lib/customer-portal-types";

interface OrderLookupFormProps {
  onLookup: (orderNumber: string, email: string) => Promise<{ success: boolean; data?: CustomerOrder; error?: string }>;
  onSuccess: (order: CustomerOrder) => void;
}

export function OrderLookupForm({ onLookup, onSuccess }: OrderLookupFormProps) {
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderNumber || !email) {
      toast.error("Please enter both order number and email", {
        position: "bottom-left",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onLookup(orderNumber, email);

      if (result.success && result.data) {
        onSuccess(result.data);
      } else {
        toast.error(result.error || "Order not found", {
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
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Track Your Order</CardTitle>
          <CardDescription>
            Enter your order details to view status and request cancellation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="e.g., ORD-1001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Look Up Order
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Need help?
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Your order number can be found in your confirmation email. Make sure
              to use the same email address you used when placing the order.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

