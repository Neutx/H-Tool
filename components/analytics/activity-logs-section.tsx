"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityLog } from "@/lib/analytics-types";
import {
  FileText,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  Mail,
  AlertTriangle,
  Eye,
  Settings,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ActivityLogsSectionProps {
  activityLogs: ActivityLog[];
}

export function ActivityLogsSection({ activityLogs }: ActivityLogsSectionProps) {
  const getEventIcon = (eventType: ActivityLog["eventType"]) => {
    const icons: Record<ActivityLog["eventType"], React.ReactNode> = {
      cancellation_requested: <FileText className="h-4 w-4" />,
      cancellation_completed: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      cancellation_rejected: <XCircle className="h-4 w-4 text-red-600" />,
      refund_initiated: <DollarSign className="h-4 w-4 text-blue-600" />,
      refund_completed: <DollarSign className="h-4 w-4 text-emerald-600" />,
      refund_failed: <DollarSign className="h-4 w-4 text-red-600" />,
      inventory_restocked: <Package className="h-4 w-4 text-blue-600" />,
      customer_notified: <Mail className="h-4 w-4 text-blue-600" />,
      fraud_alert: <AlertTriangle className="h-4 w-4 text-red-600" />,
      manual_review: <Eye className="h-4 w-4 text-amber-600" />,
      system_action: <Settings className="h-4 w-4 text-slate-600" />,
    };
    return icons[eventType] || <FileText className="h-4 w-4" />;
  };

  const getActorBadge = (actorType: "customer" | "merchant" | "system") => {
    const variants: Record<"customer" | "merchant" | "system", "default" | "secondary"> = {
      customer: "default",
      merchant: "secondary",
      system: "secondary",
    };
    return <Badge variant={variants[actorType]}>{actorType}</Badge>;
  };

  if (activityLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No activity logs found</p>
            <p className="text-sm mt-1">Activity will appear here as events occur</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Activity Logs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Chronological log of all system events ({activityLogs.length} events)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <div className="mt-0.5 rounded-full bg-slate-100 p-2 dark:bg-slate-800">
                {getEventIcon(log.eventType)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">by {log.actor}</span>
                      {getActorBadge(log.actorType)}
                      {log.orderNumber && (
                        <Badge variant="secondary" className="text-xs">
                          {log.orderNumber}
                        </Badge>
                      )}
                      {log.customerName && (
                        <span className="text-xs text-muted-foreground">
                          • {log.customerName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
                {Object.keys(log.details).length > 0 && (
                  <div className="mt-2 rounded bg-slate-100 p-2 dark:bg-slate-800">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
