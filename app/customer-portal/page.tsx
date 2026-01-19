"use client";

import { useState, useEffect } from "react";
import { OrderLookupForm } from "@/components/customer-portal/order-lookup-form";
import { OrderDetailsView } from "@/components/customer-portal/order-details-view";
import { CancellationRequestForm } from "@/components/customer-portal/cancellation-request-form";
import { StatusTracker } from "@/components/customer-portal/status-tracker";
import {
  lookupOrder,
  submitCancellationRequest,
  getCancellationStatus,
} from "@/app/actions/customer-portal";
import type { CustomerOrder } from "@/lib/customer-portal-types";

type View = "lookup" | "order" | "request" | "status";

type CancellationStatusData = {
  id: string;
  status: string;
  reason: string | null;
  reasonCategory: string | null;
  customerNotes: string | null;
  adminResponse: string | null;
  refundPreference: string;
  createdAt: Date;
  updatedAt: Date;
  timeline: Record<string, Date>;
  refundAmount: number;
  refundStatus: string | null;
};

export default function CustomerPortalPage() {
  const [view, setView] = useState<View>("lookup");
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [cancellationStatus, setCancellationStatus] = useState<CancellationStatusData | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if there's a stored order in session storage
  useEffect(() => {
    const storedOrder = sessionStorage.getItem("portal_order");
    if (storedOrder) {
      try {
        const parsedOrder = JSON.parse(storedOrder) as CustomerOrder;
        // Use setTimeout to avoid calling setState synchronously in effect
        setTimeout(() => {
          setOrder(parsedOrder);
          setView("order");
        }, 0);
      } catch {
        sessionStorage.removeItem("portal_order");
      }
    }
  }, []);

  const handleOrderLookup = async (orderData: CustomerOrder) => {
    setOrder(orderData);
    setView("order");
    // Store in session storage
    sessionStorage.setItem("portal_order", JSON.stringify(orderData));
  };

  const handleRequestCancellation = () => {
    setView("request");
  };

  const handleCancellationSubmitted = async () => {
    // Refresh order data
    if (order && order.customer.email) {
      const result = await lookupOrder(order.orderNumber, order.customer.email);
      if (result.success && "data" in result && result.data) {
        setOrder(result.data);
        sessionStorage.setItem("portal_order", JSON.stringify(result.data));
      }
    }
    setView("order");
  };

  const handleViewStatus = async () => {
    if (!order?.cancellationRequest) return;

    setLoading(true);
    const result = await getCancellationStatus(order.cancellationRequest.id);
    setLoading(false);

    if (result.success && result.data) {
      setCancellationStatus(result.data);
      setView("status");
    }
  };

  const handleBackToOrder = () => {
    setView("order");
  };

  const handleNewLookup = () => {
    setOrder(null);
    setCancellationStatus(null);
    setView("lookup");
    sessionStorage.removeItem("portal_order");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">H-Tool Customer Portal</h1>
              <p className="text-sm text-muted-foreground">
                Track and manage your orders
              </p>
            </div>
            {order && view !== "lookup" && (
              <button
                onClick={handleNewLookup}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Look up different order →
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {view === "lookup" && (
          <OrderLookupForm onLookup={lookupOrder} onSuccess={handleOrderLookup} />
        )}

        {view === "order" && order && (
          <OrderDetailsView
            order={order}
            onRequestCancellation={handleRequestCancellation}
            onViewStatus={handleViewStatus}
          />
        )}

        {view === "request" && order && (
          <CancellationRequestForm
            order={order}
            onSubmit={submitCancellationRequest}
            onSuccess={handleCancellationSubmitted}
            onCancel={handleBackToOrder}
          />
        )}

        {view === "status" && order && cancellationStatus && (
          <StatusTracker
            status={cancellationStatus}
            order={order}
            onBack={handleBackToOrder}
          />
        )}

        {loading && (
          <div className="flex h-[50vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 dark:bg-slate-900">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Need help? Contact us at support@h-tool.com</p>
        </div>
      </footer>
    </div>
  );
}
