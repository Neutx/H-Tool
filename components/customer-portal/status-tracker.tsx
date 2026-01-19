"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import type { CustomerOrder } from "@/lib/customer-portal-types";

interface CancellationStatusData {
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
}

interface StatusTrackerProps {
  status: CancellationStatusData;
  order: CustomerOrder;
  onBack: () => void;
}

export function StatusTracker({ status, order, onBack }: StatusTrackerProps) {
  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case "denied":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "info_requested":
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      default:
        return <Clock className="h-5 w-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (statusValue: string) => {
    const statusMap: Record<string, { variant: string; label: string }> = {
      pending: { variant: "warning", label: "Pending Review" },
      approved: { variant: "success", label: "Approved" },
      processing: { variant: "default", label: "Processing" },
      completed: { variant: "success", label: "Completed" },
      denied: { variant: "error", label: "Denied" },
      info_requested: { variant: "warning", label: "Information Requested" },
    };
    return statusMap[statusValue] || { variant: "secondary", label: statusValue };
  };

  const statusBadge = getStatusBadge(status.status);
  const timeline = status.timeline || {};

  // Timeline steps
  const steps = [
    {
      key: "requested",
      label: "Request Submitted",
      description: "Your cancellation request was received",
      completed: !!timeline.requested,
      timestamp: timeline.requested,
    },
    {
      key: "approved",
      label: "Request Approved",
      description: "Your request has been reviewed and approved",
      completed: !!timeline.approved,
      timestamp: timeline.approved,
    },
    {
      key: "processing",
      label: "Processing Cancellation",
      description: "We're processing your refund",
      completed: !!timeline.processing,
      timestamp: timeline.processing,
    },
    {
      key: "refunded",
      label: "Refund Issued",
      description: "Refund has been processed",
      completed: !!timeline.refunded,
      timestamp: timeline.refunded,
    },
    {
      key: "completed",
      label: "Completed",
      description: "Cancellation complete",
      completed: status.status === "completed",
      timestamp: timeline.completed,
    },
  ];

  // Handle denied state
  if (status.status === "denied") {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="outline" onClick={onBack} size="sm">
            ← Back to Order
          </Button>
        </div>

        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cancellation Request Denied</CardTitle>
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardDescription>Order #{order.orderNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Reason for Denial:</p>
                <p className="mt-1 text-sm">
                  {status.adminResponse || "No reason provided"}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Denied on: {formatDateTime(timeline.denied)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Original Request</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Reason:</span> {status.reason}
              </div>
              {status.customerNotes && (
                <div>
                  <span className="font-semibold">Notes:</span> {status.customerNotes}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" onClick={onBack} size="sm">
          ← Back to Order
        </Button>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cancellation Status</CardTitle>
              <CardDescription>Order #{order.orderNumber}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(status.status)}
              <Badge {...statusBadge}>{statusBadge.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Info Requested Alert */}
          {status.status === "info_requested" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-400">
                    Additional Information Requested
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    {status.adminResponse ||
                      "We need more information to process your request."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              const isActive = step.completed;

              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-700"
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className={`h-full w-0.5 ${
                          isActive
                            ? "bg-emerald-600"
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                        style={{ minHeight: "40px" }}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="font-semibold">{step.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {step.description}
                    </div>
                    {step.timestamp && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(step.timestamp)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Refund Information */}
      {status.refundAmount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Refund Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Refund Amount:</span>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(status.refundAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Refund Status:</span>
                <Badge variant={status.refundStatus === "completed" ? "success" : "warning"}>
                  {status.refundStatus || "Pending"}
                </Badge>
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-muted-foreground">
                  Refunds typically appear in your account within 5-7 business days
                  after processing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Details */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">Category:</span>{" "}
              <Badge variant="secondary">{status.reasonCategory}</Badge>
            </div>
            <div>
              <span className="font-semibold">Reason:</span>
              <p className="mt-1">{status.reason}</p>
            </div>
            {status.customerNotes && (
              <div>
                <span className="font-semibold">Additional Notes:</span>
                <p className="mt-1">{status.customerNotes}</p>
              </div>
            )}
            {status.adminResponse && status.status !== "info_requested" && (
              <div>
                <span className="font-semibold">Admin Response:</span>
                <p className="mt-1">{status.adminResponse}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

