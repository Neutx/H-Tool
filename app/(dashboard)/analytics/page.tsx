"use client";

import { useState, useEffect, useCallback } from "react";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import {
  getAnalyticsMetrics,
  getCancellationRecords,
  getActivityLogs,
  getFraudAlerts,
  exportAnalyticsReport,
} from "@/app/actions/analytics";
import { useOrganization } from "@/hooks/use-auth";
import type {
  Metrics,
  CancellationRecord,
  ActivityLog,
  FraudAlert,
  TimeRange,
} from "@/lib/analytics-types";

export default function AnalyticsPage() {
  const { organization } = useOrganization();
  const organizationId = organization?.id;
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [records, setRecords] = useState<CancellationRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("L7D");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [metricsResult, recordsResult, logsResult, alertsResult] = await Promise.all([
        getAnalyticsMetrics(organizationId, timeRange, compareEnabled),
        getCancellationRecords(organizationId),
        getActivityLogs(organizationId),
        getFraudAlerts(organizationId),
      ]);

      if (metricsResult.success && metricsResult.data) {
        setMetrics(metricsResult.data);
      }
      if (recordsResult.success && recordsResult.data) {
        setRecords(recordsResult.data);
      }
      if (logsResult.success && logsResult.data) {
        setActivityLogs(logsResult.data);
      }
      if (alertsResult.success && alertsResult.data) {
        setFraudAlerts(alertsResult.data);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, timeRange, compareEnabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  const handleCompareToggle = (enabled: boolean) => {
    setCompareEnabled(enabled);
  };

  const handleExportReport = async (format: "csv" | "pdf") => {
    if (!organizationId) return;
    await exportAnalyticsReport(organizationId, format);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  return (
    <AnalyticsDashboard
      metrics={metrics}
      cancellationRecords={records}
      activityLogs={activityLogs}
      fraudAlerts={fraudAlerts}
      selectedTimeRange={timeRange}
      compareEnabled={compareEnabled}
      onTimeRangeChange={handleTimeRangeChange}
      onCompareToggle={handleCompareToggle}
      onExportReport={handleExportReport}
    />
  );
}

