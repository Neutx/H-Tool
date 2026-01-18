"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Package, Calendar, DollarSign, Mail } from "lucide-react";

interface OrderDetailsViewProps {
  order: any;
  onRequestCancellation: () => void;
  onViewStatus: () => void;
}

export function OrderDetailsView({
  order,
  onRequestCancellation,
  onViewStatus,
}: OrderDetailsViewProps) {
  const getOrderStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
      pending: { variant: "warning", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      processing: { variant: "default", label: "Processing" },
      shipped: { variant: "default", label: "Shipped" },
      delivered: { variant: "success", label: "Delivered" },
      cancelled: { variant: "error", label: "Cancelled" },
    };
    return statusMap[status.toLowerCase()] || { variant: "secondary", label: status };
  };

  const getCancellationStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
      pending: { variant: "warning", label: "Pending Review" },
      approved: { variant: "success", label: "Approved" },
      processing: { variant: "default", label: "Processing" },
      completed: { variant: "success", label: "Completed" },
      denied: { variant: "error", label: "Denied" },
      info_requested: { variant: "warning", label: "Info Requested" },
    };
    return statusMap[status] || { variant: "secondary", label: status };
  };

  const orderStatus = getOrderStatusBadge(order.status);
  const hasCancellationRequest = !!order.cancellationRequest;
  const cancellationStatus = hasCancellationRequest
    ? getCancellationStatusBadge(order.cancellationRequest.status)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order {order.orderNumber}</h1>
          <p className="mt-1 text-muted-foreground">
            Ordered on {formatDate(order.orderDate)}
          </p>
        </div>
        <Badge {...orderStatus}>{orderStatus.label}</Badge>
      </div>

      {/* Cancellation Request Status */}
      {hasCancellationRequest && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-900/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cancellation Request</CardTitle>
              <Badge {...cancellationStatus}>{cancellationStatus!.label}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Reason:</strong> {order.cancellationRequest.reason}
              </p>
              <p>
                <strong>Requested:</strong>{" "}
                {formatDate(order.cancellationRequest.createdAt)}
              </p>
              {order.cancellationRequest.adminResponse && (
                <div className="mt-3 rounded-lg border border-emerald-300 bg-white p-3 dark:border-emerald-800 dark:bg-emerald-950">
                  <p className="font-semibold">Admin Response:</p>
                  <p className="mt-1">{order.cancellationRequest.adminResponse}</p>
                </div>
              )}
            </div>
            <Button onClick={onViewStatus} className="mt-4" variant="outline">
              View Full Status
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Order Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Package className="mr-2 h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.status}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Order Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(order.totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{order.customer.email}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Order Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{formatDate(order.orderDate)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.lineItems.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(item.totalPrice)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(item.price)} each
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      {!hasCancellationRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Need to cancel your order?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              You can request a cancellation and we'll process it as quickly as
              possible. Depending on the order status, you may be eligible for a
              full refund.
            </p>
            <Button onClick={onRequestCancellation} className="w-full">
              Request Cancellation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

