"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CancellationRecord } from "@/lib/analytics-types";
import { Search, Eye, Filter } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface CancellationRecordsTableProps {
  records: CancellationRecord[];
  onViewDetails: (recordId: string) => void;
}

export function CancellationRecordsTable({
  records,
  onViewDetails,
}: CancellationRecordsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "warning" | "error" | "secondary" | "success" | "destructive" | "outline"; label: string }> = {
      completed: { variant: "success", label: "Completed" },
      pending: { variant: "warning", label: "Pending" },
      failed: { variant: "error", label: "Failed" },
      rejected: { variant: "secondary", label: "Rejected" },
    };
    const config = variants[status] || { variant: "default" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRiskBadge = (level: string) => {
    const variants: Record<string, { variant: "default" | "warning" | "error" | "secondary" | "success" | "destructive" | "outline"; label: string }> = {
      low: { variant: "default", label: "Low" },
      medium: { variant: "warning", label: "Medium" },
      high: { variant: "error", label: "High" },
    };
    const config = variants[level] || { variant: "default" as const, label: level };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      searchQuery === "" ||
      record.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "all" || record.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cancellation Records</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {filteredRecords.length} of {records.length} records
        </p>
      </CardHeader>
      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No records found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Initiated By</th>
                  <th className="pb-3 font-medium">Reason</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Risk</th>
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                    <td className="py-3">
                      <div className="font-medium">{record.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(record.orderCreatedAt)}
                      </div>
                    </td>
                    <td className="py-3">
                      <div>{record.customerName}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {record.customerEmail}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary">{record.initiatedBy}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="max-w-[200px] truncate" title={record.reasonDescription}>
                        {record.reasonDescription}
                      </div>
                    </td>
                    <td className="py-3 font-medium">
                      {record.refundAmount ? formatCurrency(record.refundAmount) : "-"}
                    </td>
                    <td className="py-3">{getStatusBadge(record.status)}</td>
                    <td className="py-3">{getRiskBadge(record.fraudRiskLevel)}</td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {record.processingTime ? `${record.processingTime}s` : "-"}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(record.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
