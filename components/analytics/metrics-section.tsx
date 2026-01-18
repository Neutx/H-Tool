"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Metrics, TimeRange } from "@/lib/analytics-types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  XCircle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MetricsSectionProps {
  metrics: Metrics;
  selectedTimeRange: TimeRange;
  compareEnabled: boolean;
  onTimeRangeChange: (range: TimeRange) => void;
  onCompareToggle: (enabled: boolean) => void;
}

export function MetricsSection({
  metrics,
  selectedTimeRange,
  compareEnabled,
  onTimeRangeChange,
  onCompareToggle,
}: MetricsSectionProps) {
  const { currentPeriod, comparisonPeriod, trends } = metrics;

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: "L7D", label: "Last 7 Days" },
    { value: "L14D", label: "Last 14 Days" },
    { value: "L30D", label: "Last 30 Days" },
    { value: "L90D", label: "Last 90 Days" },
  ];

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    return null;
  };

  const getTrendColor = (change: number, inverse: boolean = false) => {
    if (change === 0) return "text-muted-foreground";
    const isPositive = inverse ? change < 0 : change > 0;
    return isPositive ? "text-emerald-600" : "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={selectedTimeRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeRangeChange(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compareEnabled}
              onChange={(e) => onCompareToggle(e.target.checked)}
              className="rounded"
            />
            Compare to previous period
          </label>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Cancellations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cancellations</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPeriod.totalCancellations}</div>
            {compareEnabled && comparisonPeriod && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(trends.totalCancellationsChange)}`}>
                {getTrendIcon(trends.totalCancellationsChange)}
                <span>
                  {Math.abs(trends.totalCancellationsChange)} from previous period
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {currentPeriod.totalOrders} total orders
            </p>
          </CardContent>
        </Card>

        {/* Cancellation Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPeriod.cancellationRate}%</div>
            {compareEnabled && comparisonPeriod && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(trends.cancellationRateChange)}`}>
                {getTrendIcon(trends.cancellationRateChange)}
                <span>
                  {Math.abs(trends.cancellationRateChange).toFixed(1)}% from previous
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Of all orders placed
            </p>
          </CardContent>
        </Card>

        {/* Refund Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentPeriod.refundSuccessRate}%</div>
            {compareEnabled && comparisonPeriod && (
              <div className={`flex items-center gap-1 text-xs ${getTrendColor(trends.refundSuccessRateChange, true)}`}>
                {getTrendIcon(-trends.refundSuccessRateChange)}
                <span>
                  {Math.abs(trends.refundSuccessRateChange).toFixed(1)}% from previous
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        {/* Total Refunded */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(currentPeriod.totalRefunded)}
            </div>
            {compareEnabled && comparisonPeriod && (
              <div className="text-xs text-muted-foreground mt-1">
                vs {formatCurrency(comparisonPeriod.totalRefunded)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatCurrency(currentPeriod.averageRefundAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Initiator Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Initiated By</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Customer</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${currentPeriod.initiatorSplit.customer}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {currentPeriod.initiatorSplit.customer}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Merchant</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${currentPeriod.initiatorSplit.merchant}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {currentPeriod.initiatorSplit.merchant}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">System</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${currentPeriod.initiatorSplit.system}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {currentPeriod.initiatorSplit.system}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reason Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cancellation Reasons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Customer Request</span>
              <span className="font-medium">{currentPeriod.reasonBreakdown.customer}</span>
            </div>
            <div className="flex justify-between">
              <span>Inventory Issues</span>
              <span className="font-medium">{currentPeriod.reasonBreakdown.inventory}</span>
            </div>
            <div className="flex justify-between">
              <span>Fraud</span>
              <span className="font-medium">{currentPeriod.reasonBreakdown.fraud}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Declined</span>
              <span className="font-medium">{currentPeriod.reasonBreakdown.paymentDeclined}</span>
            </div>
            <div className="flex justify-between">
              <span>Other</span>
              <span className="font-medium">{currentPeriod.reasonBreakdown.other}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Completed</span>
              <Badge variant="success">{currentPeriod.statusBreakdown.completed}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Failed</span>
              <Badge variant="error">{currentPeriod.statusBreakdown.failed}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Pending</span>
              <Badge variant="warning">{currentPeriod.statusBreakdown.pending}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Rejected</span>
              <Badge variant="secondary">{currentPeriod.statusBreakdown.rejected}</Badge>
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Fraud Risk</span>
                <span className={`text-sm font-bold ${currentPeriod.fraudRiskPercentage > 10 ? "text-red-600" : "text-emerald-600"}`}>
                  {currentPeriod.fraudRiskPercentage}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
