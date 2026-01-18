"use client";

import { useState } from "react";
import { AlertTriangle, Clock, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import type { ReviewQueueItem } from "@/lib/types";

interface ReviewQueueProps {
  items: any[];
  onReviewItem: (item: any) => void;
}

export function ReviewQueue({ items, onReviewItem }: ReviewQueueProps) {
  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      default:
        return "success";
    }
  };

  if (items.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No orders in review queue</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  Order #{item.order.orderNumber}
                </h3>
                <Badge variant={getRiskBadgeVariant(item.riskLevel)}>
                  {item.riskLevel} risk
                </Badge>
                <Badge variant="warning">{item.reviewStatus}</Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDateTime(item.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(item.order.totalAmount)}
                </div>
                <div>{item.order.customer.name || item.order.customer.email}</div>
              </div>

              <p className="text-sm">
                <span className="font-medium">Reason:</span>{" "}
                {item.cancellationRequest.reason}
              </p>
            </div>

            <Button onClick={() => onReviewItem(item)}>Review</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

