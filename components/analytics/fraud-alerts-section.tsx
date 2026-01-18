"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FraudAlert } from "@/lib/analytics-types";
import { AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface FraudAlertsSectionProps {
  fraudAlerts: FraudAlert[];
}

export function FraudAlertsSection({ fraudAlerts }: FraudAlertsSectionProps) {
  const getRiskBadge = (level: "low" | "medium" | "high") => {
    const variants = {
      low: "default",
      medium: "warning",
      high: "error",
    };
    return <Badge variant={variants[level] as any}>{level.toUpperCase()}</Badge>;
  };

  if (fraudAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Fraud Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShieldAlert className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No fraud alerts detected</p>
            <p className="text-sm mt-1">All cancellations appear legitimate</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Fraud Alerts
          </CardTitle>
          <Badge variant="error">{fraudAlerts.length}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          High-risk cancellation requests requiring attention
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fraudAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold">Order {alert.orderNumber}</span>
                    {getRiskBadge(alert.riskLevel)}
                    <Badge variant={alert.status === "rejected" ? "secondary" : "warning"}>
                      {alert.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[100px]">Customer:</span>
                      <span>{alert.customerName}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[100px]">Email:</span>
                      <span className="text-muted-foreground">{alert.customerEmail}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[100px]">Reason:</span>
                      <span className="text-red-800 dark:text-red-300">{alert.rejectionReason}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[100px]">Risk Score:</span>
                      <span className="font-bold">{alert.riskScore.toFixed(1)} / 10</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium min-w-[100px]">Order Amount:</span>
                      <span>{formatCurrency(alert.orderAmount)}</span>
                    </div>
                    {alert.riskFactors.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium min-w-[100px]">Risk Factors:</span>
                        <div className="flex flex-wrap gap-1">
                          {alert.riskFactors.map((factor, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {factor.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {alert.rejectedAt && (
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                        <Clock className="h-3 w-3 mt-0.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {alert.status === "rejected" ? "Rejected" : "Flagged"} on{" "}
                          {formatDateTime(alert.rejectedAt)} by {alert.rejectedBy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
