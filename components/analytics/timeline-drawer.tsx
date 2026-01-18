"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CancellationTimeline, TimelineEvent } from "@/lib/analytics-types";
import { X, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface TimelineDrawerProps {
  timeline: CancellationTimeline | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TimelineDrawer({ timeline, isOpen, onClose }: TimelineDrawerProps) {
  if (!isOpen || !timeline) return null;

  const getEventIcon = (eventType: TimelineEvent["eventType"]) => {
    const icons: Record<TimelineEvent["eventType"], React.ReactNode> = {
      request_initiated: <Clock className="h-4 w-4" />,
      validation_started: <Clock className="h-4 w-4" />,
      validation_passed: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      validation_failed: <XCircle className="h-4 w-4 text-red-600" />,
      auto_approved: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      manual_review: <AlertCircle className="h-4 w-4 text-amber-600" />,
      reviewed: <CheckCircle className="h-4 w-4" />,
      refund_initiated: <Clock className="h-4 w-4 text-blue-600" />,
      refund_completed: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      refund_failed: <XCircle className="h-4 w-4 text-red-600" />,
      inventory_restocked: <CheckCircle className="h-4 w-4 text-blue-600" />,
      customer_notified: <CheckCircle className="h-4 w-4 text-blue-600" />,
      cancellation_completed: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      cancellation_rejected: <XCircle className="h-4 w-4 text-red-600" />,
      fraud_check: <AlertCircle className="h-4 w-4 text-amber-600" />,
    };
    return icons[eventType] || <Clock className="h-4 w-4" />;
  };

  const getActorBadge = (actorType: "customer" | "merchant" | "system") => {
    const variants = {
      customer: "default",
      merchant: "secondary",
      system: "secondary",
    };
    return <Badge variant={variants[actorType] as any}>{actorType}</Badge>;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-slate-950 shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-950 border-b z-10">
          <div className="flex items-center justify-between p-6">
            <div>
              <h2 className="text-2xl font-bold">Cancellation Timeline</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Complete step-by-step process
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          {timeline.events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No timeline events available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeline.events.map((event, index) => {
                const isLast = index === timeline.events.length - 1;
                const isFirst = index === 0;

                return (
                  <div key={event.id} className="relative">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                    )}

                    <Card className={isFirst ? "border-emerald-200 dark:border-emerald-900" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-slate-100 p-2 dark:bg-slate-800">
                            {getEventIcon(event.eventType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-base font-semibold">
                                {event.description}
                              </CardTitle>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDateTime(event.timestamp)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                by {event.actor}
                              </span>
                              {getActorBadge(event.actorType)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {Object.keys(event.details).length > 0 && (
                        <CardContent className="pt-0">
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                            <p className="text-xs font-semibold mb-2 text-muted-foreground">
                              Event Details
                            </p>
                            <div className="space-y-1 text-sm">
                              {Object.entries(event.details).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {key.replace(/_/g, " ")}:
                                  </span>
                                  <span className="font-medium">
                                    {typeof value === "object"
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
