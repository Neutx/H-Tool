"use client";

import { useState } from "react";
import { MetricsSection } from "./metrics-section";
import { FraudAlertsSection } from "./fraud-alerts-section";
import { CancellationRecordsTable } from "./cancellation-records-table";
import { ActivityLogsSection } from "./activity-logs-section";
import { TimelineDrawer } from "./timeline-drawer";
import { Button } from "@/components/ui/button";
import type {
  Metrics,
  CancellationRecord,
  ActivityLog,
  FraudAlert,
  CancellationTimeline,
  TimeRange,
} from "@/lib/analytics-types";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface AnalyticsDashboardProps {
  metrics: Metrics;
  cancellationRecords: CancellationRecord[];
  activityLogs: ActivityLog[];
  fraudAlerts: FraudAlert[];
  selectedTimeRange?: TimeRange;
  compareEnabled?: boolean;
  onTimeRangeChange?: (range: TimeRange) => void;
  onCompareToggle?: (enabled: boolean) => void;
  onViewRecordDetails?: (recordId: string) => void;
  onExportReport?: (format: "csv" | "pdf") => void;
}

export function AnalyticsDashboard({
  metrics,
  cancellationRecords,
  activityLogs,
  fraudAlerts,
  selectedTimeRange = "L7D",
  compareEnabled = false,
  onTimeRangeChange = () => {},
  onCompareToggle = () => {},
  onViewRecordDetails = () => {},
  onExportReport = () => {},
}: AnalyticsDashboardProps) {
  const [selectedTimeline, setSelectedTimeline] = useState<CancellationTimeline | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleViewDetails = async (recordId: string) => {
    try {
      // This would fetch the timeline from the server
      // For now, create a simple timeline
      const record = cancellationRecords.find((r) => r.id === recordId);
      if (!record) return;

      const timeline: CancellationTimeline = {
        cancellationRecordId: recordId,
        events: [
          {
            id: `${recordId}-1`,
            timestamp: record.initiatedTimestamp,
            eventType: "request_initiated",
            description: "Cancellation request initiated",
            actor: record.customerName,
            actorType: record.initiatedBy,
            details: {
              orderNumber: record.orderNumber,
              reason: record.reasonDescription,
            },
          },
          {
            id: `${recordId}-2`,
            timestamp: record.initiatedTimestamp,
            eventType: "validation_passed",
            description: "All validation checks passed",
            actor: "System",
            actorType: "system",
            details: {},
          },
        ],
      };

      if (record.completionTimestamp) {
        timeline.events.push({
          id: `${recordId}-3`,
          timestamp: record.completionTimestamp,
          eventType: "cancellation_completed",
          description: "Cancellation process completed",
          actor: "System",
          actorType: "system",
          details: {
            processingTime: record.processingTime,
          },
        });
      }

      setSelectedTimeline(timeline);
      setIsDrawerOpen(true);
      onViewRecordDetails(recordId);
    } catch (error) {
      toast.error("Failed to load timeline", {
        position: "bottom-left",
      });
    }
  };

  const handleExport = (format: "csv" | "pdf") => {
    toast.success(`Exporting ${format.toUpperCase()} report...`, {
      position: "bottom-left",
    });
    onExportReport(format);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Export */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics and audit trail system
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Metrics Section */}
        <MetricsSection
          metrics={metrics}
          selectedTimeRange={selectedTimeRange}
          compareEnabled={compareEnabled}
          onTimeRangeChange={onTimeRangeChange}
          onCompareToggle={onCompareToggle}
        />

        {/* Fraud Alerts Section */}
        {fraudAlerts.length > 0 && <FraudAlertsSection fraudAlerts={fraudAlerts} />}

        {/* Cancellation Records Table */}
        <CancellationRecordsTable
          records={cancellationRecords}
          onViewDetails={handleViewDetails}
        />

        {/* Activity Logs Section */}
        <ActivityLogsSection activityLogs={activityLogs} />
      </div>

      {/* Timeline Drawer */}
      <TimelineDrawer
        timeline={selectedTimeline}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
