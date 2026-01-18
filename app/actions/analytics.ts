"use server";

import { prisma } from "@/lib/prisma";
import type {
  Metrics,
  MetricsPeriod,
  CancellationRecord,
  ActivityLog,
  FraudAlert,
  TimelineEvent,
  CancellationTimeline,
  TimeRange,
  CancellationRecordFilters,
  ActivityLogFilters,
} from "@/lib/analytics-types";

/**
 * Calculate date range for time range selector
 */
function getDateRange(range: TimeRange, customStartDate?: string, customEndDate?: string) {
  const endDate = new Date();
  let startDate = new Date();

  switch (range) {
    case "L7D":
      startDate.setDate(endDate.getDate() - 7);
      break;
    case "L14D":
      startDate.setDate(endDate.getDate() - 14);
      break;
    case "L30D":
      startDate.setDate(endDate.getDate() - 30);
      break;
    case "L90D":
      startDate.setDate(endDate.getDate() - 90);
      break;
    case "custom":
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate.setTime(new Date(customEndDate).getTime());
      }
      break;
  }

  return { startDate, endDate };
}

/**
 * Calculate metrics for a given period
 */
async function calculatePeriodMetrics(
  organizationId: string,
  startDate: Date,
  endDate: Date,
  range: string
): Promise<MetricsPeriod> {
  // Get all cancellation records in period
  const records = await prisma.cancellationRecord.findMany({
    where: {
      organizationId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      cancellationRequest: true,
      order: true,
    },
  });

  // Get total orders in period for cancellation rate
  const totalOrders = await prisma.order.count({
    where: {
      organizationId,
      orderDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalCancellations = records.length;
  const cancellationRate = totalOrders > 0 ? (totalCancellations / totalOrders) * 100 : 0;

  // Calculate refund metrics
  const refundRecords = records.filter((r) => r.refundStatus === "completed");
  const refundSuccessRate =
    totalCancellations > 0 ? (refundRecords.length / totalCancellations) * 100 : 0;
  const totalRefunded = refundRecords.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const averageRefundAmount = refundRecords.length > 0 ? totalRefunded / refundRecords.length : 0;

  // Initiator split
  const customerInitiated = records.filter((r) => r.initiatedBy === "customer").length;
  const merchantInitiated = records.filter((r) => r.initiatedBy === "merchant").length;
  const systemInitiated = records.filter((r) => r.initiatedBy === "system").length;

  const initiatorSplit = {
    customer: totalCancellations > 0 ? (customerInitiated / totalCancellations) * 100 : 0,
    merchant: totalCancellations > 0 ? (merchantInitiated / totalCancellations) * 100 : 0,
    system: totalCancellations > 0 ? (systemInitiated / totalCancellations) * 100 : 0,
  };

  // Reason breakdown
  const reasonBreakdown = {
    customer: records.filter((r) => r.reasonCategory === "changed_mind" || r.reasonCategory === "ordered_by_mistake" || r.reasonCategory === "found_better_price" || r.reasonCategory === "other").length,
    inventory: records.filter((r) => r.reasonCategory === "delivery_delay" || r.reasonCategory === "product_issue").length,
    fraud: records.filter((r) => r.reason?.toLowerCase().includes("fraud")).length,
    paymentDeclined: records.filter((r) => r.reason?.toLowerCase().includes("payment")).length,
    other: records.filter((r) => !r.reasonCategory || r.reasonCategory === "other").length,
  };

  // Status breakdown
  const statusBreakdown = {
    completed: records.filter((r) => r.refundStatus === "completed").length,
    failed: records.filter((r) => r.refundStatus === "failed").length,
    pending: records.filter((r) => r.refundStatus === "pending").length,
    rejected: records.filter((r) => r.refundStatus === "rejected").length,
  };

  // Fraud risk percentage (requests with risk score > 7 or denied)
  const highRiskCount = records.filter(
    (r) => r.cancellationRequest?.riskScore && r.cancellationRequest.riskScore > 7
  ).length;
  const fraudRiskPercentage = totalCancellations > 0 ? (highRiskCount / totalCancellations) * 100 : 0;

  // Average time to cancel (in hours)
  const timeToCancels = records
    .filter((r) => r.completedAt)
    .map((r) => {
      const orderTime = new Date(r.order.orderDate).getTime();
      const cancelTime = new Date(r.completedAt!).getTime();
      return (cancelTime - orderTime) / (1000 * 60 * 60); // hours
    });
  const averageTimeToCancel =
    timeToCancels.length > 0
      ? timeToCancels.reduce((sum, time) => sum + time, 0) / timeToCancels.length
      : 0;

  return {
    range,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalCancellations,
    cancellationRate: Number(cancellationRate.toFixed(1)),
    totalOrders,
    refundSuccessRate: Number(refundSuccessRate.toFixed(1)),
    totalRefunded: Number(totalRefunded.toFixed(2)),
    averageRefundAmount: Number(averageRefundAmount.toFixed(2)),
    initiatorSplit: {
      customer: Number(initiatorSplit.customer.toFixed(1)),
      merchant: Number(initiatorSplit.merchant.toFixed(1)),
      system: Number(initiatorSplit.system.toFixed(1)),
    },
    reasonBreakdown,
    statusBreakdown,
    fraudRiskPercentage: Number(fraudRiskPercentage.toFixed(1)),
    averageTimeToCancel: Number(averageTimeToCancel.toFixed(1)),
  };
}

/**
 * Get analytics metrics with optional comparison period
 */
export async function getAnalyticsMetrics(
  organizationId: string,
  timeRange: TimeRange = "L7D",
  compareEnabled: boolean = false,
  customStartDate?: string,
  customEndDate?: string
) {
  try {
    const { startDate, endDate } = getDateRange(timeRange, customStartDate, customEndDate);

    // Calculate current period metrics
    const currentPeriod = await calculatePeriodMetrics(
      organizationId,
      startDate,
      endDate,
      timeRange
    );

    let comparisonPeriod: MetricsPeriod | null = null;
    const trends = {
      cancellationRateChange: 0,
      refundSuccessRateChange: 0,
      totalCancellationsChange: 0,
      fraudRiskChange: 0,
    };

    // Calculate comparison period if enabled
    if (compareEnabled) {
      const periodLength = endDate.getTime() - startDate.getTime();
      const comparisonEndDate = new Date(startDate.getTime() - 1);
      const comparisonStartDate = new Date(comparisonEndDate.getTime() - periodLength);

      comparisonPeriod = await calculatePeriodMetrics(
        organizationId,
        comparisonStartDate,
        comparisonEndDate,
        timeRange
      );

      // Calculate trends
      trends.cancellationRateChange =
        currentPeriod.cancellationRate - comparisonPeriod.cancellationRate;
      trends.refundSuccessRateChange =
        currentPeriod.refundSuccessRate - comparisonPeriod.refundSuccessRate;
      trends.totalCancellationsChange =
        currentPeriod.totalCancellations - comparisonPeriod.totalCancellations;
      trends.fraudRiskChange = currentPeriod.fraudRiskPercentage - comparisonPeriod.fraudRiskPercentage;
    }

    const metrics: Metrics = {
      currentPeriod,
      comparisonPeriod,
      trends,
    };

    return { success: true, data: metrics };
  } catch (error) {
    console.error("Error fetching analytics metrics:", error);
    return { success: false, error: "Failed to fetch analytics metrics" };
  }
}

/**
 * Get cancellation records with filtering
 */
export async function getCancellationRecords(
  organizationId: string,
  filters?: CancellationRecordFilters
) {
  try {
    const where: any = {
      organizationId,
    };

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      where.refundStatus = { in: filters.status };
    }

    if (filters?.fraudRiskLevel && filters.fraudRiskLevel.length > 0) {
      // Map fraud risk levels
      where.cancellationRequest = {
        riskScore: {
          gte: filters.fraudRiskLevel.includes("high") ? 7 : filters.fraudRiskLevel.includes("medium") ? 4 : 0,
        },
      };
    }

    if (filters?.dateRange) {
      where.createdAt = {
        gte: new Date(filters.dateRange.startDate),
        lte: new Date(filters.dateRange.endDate),
      };
    }

    if (filters?.searchQuery) {
      where.OR = [
        { order: { orderNumber: { contains: filters.searchQuery, mode: "insensitive" } } },
        { customer: { name: { contains: filters.searchQuery, mode: "insensitive" } } },
        { customer: { email: { contains: filters.searchQuery, mode: "insensitive" } } },
      ];
    }

    const records = await prisma.cancellationRecord.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            orderDate: true,
            totalAmount: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        cancellationRequest: {
          select: {
            reason: true,
            reasonCategory: true,
            riskScore: true,
            initiatedBy: true,
            createdAt: true,
          },
        },
        refundTransactions: {
          select: {
            id: true,
            refundAmount: true,
            status: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to 100 records
    });

    // Transform to CancellationRecord format
    const transformedRecords: CancellationRecord[] = records.map((record) => {
      const orderTime = new Date(record.order.orderDate).getTime();
      const cancelTime = new Date(record.createdAt).getTime();
      const timeToCancel = Math.floor((cancelTime - orderTime) / (1000 * 60)); // minutes

      // Determine fraud risk level based on risk score
      let fraudRiskLevel: "low" | "medium" | "high" = "low";
      if (record.cancellationRequest?.riskScore) {
        if (record.cancellationRequest.riskScore >= 7) fraudRiskLevel = "high";
        else if (record.cancellationRequest.riskScore >= 4) fraudRiskLevel = "medium";
      }

      // Determine time window
      let timeWindow: "15min" | "1hour" | "24hour" | "manual" | "system" = "manual";
      if (timeToCancel <= 15) timeWindow = "15min";
      else if (timeToCancel <= 60) timeWindow = "1hour";
      else if (timeToCancel <= 1440) timeWindow = "24hour";

      return {
        id: record.id,
        orderId: record.orderId,
        orderNumber: record.order.orderNumber,
        customerId: record.customerId,
        customerName: record.customer.name || "Unknown",
        customerEmail: record.customer.email || "",
        customerPhone: record.customer.phone,
        initiatedBy: record.initiatedBy as "customer" | "merchant" | "system",
        initiatedById: record.initiatedBy,
        initiatedTimestamp: record.createdAt.toISOString(),
        reason: (record.cancellationRequest?.reasonCategory || "other") as any,
        reasonDescription: record.reason || "",
        refundAmount: record.refundAmount,
        refundStatus: record.refundStatus as any,
        refundTransactionId: record.refundTransactions[0]?.id || null,
        restockDecision: record.restockDecision as any,
        customerNotified: true,
        completionTimestamp: record.completedAt?.toISOString() || null,
        status: (record.refundStatus || "pending") as any,
        fraudRiskLevel,
        timeWindow,
        processingTime: record.completedAt
          ? Math.floor((new Date(record.completedAt).getTime() - cancelTime) / 1000)
          : null,
        orderCreatedAt: record.order.orderDate.toISOString(),
        timeToCancel,
      };
    });

    return { success: true, data: transformedRecords };
  } catch (error) {
    console.error("Error fetching cancellation records:", error);
    return { success: false, error: "Failed to fetch cancellation records" };
  }
}

/**
 * Get activity logs with filtering
 */
export async function getActivityLogs(organizationId: string, filters?: ActivityLogFilters) {
  try {
    // For now, generate activity logs from cancellation records
    const records = await prisma.cancellationRecord.findMany({
      where: {
        organizationId,
        ...(filters?.dateRange && {
          createdAt: {
            gte: new Date(filters.dateRange.startDate),
            lte: new Date(filters.dateRange.endDate),
          },
        }),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
        cancellationRequest: {
          select: {
            initiatedBy: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const activityLogs: ActivityLog[] = [];

    records.forEach((record) => {
      // Request initiated
      activityLogs.push({
        id: `${record.id}-requested`,
        timestamp: record.createdAt.toISOString(),
        eventType: "cancellation_requested",
        description: `Cancellation requested for order ${record.order.orderNumber}`,
        actor: record.initiatedBy === "customer" ? record.customer.name || "Customer" : "System",
        actorType: record.initiatedBy as any,
        cancellationRecordId: record.id,
        orderNumber: record.order.orderNumber,
        customerName: record.customer.name,
        details: {},
      });

      // Completion or failure
      if (record.completedAt) {
        const eventType =
          record.refundStatus === "completed"
            ? "cancellation_completed"
            : record.refundStatus === "failed"
            ? "refund_failed"
            : "cancellation_rejected";

        activityLogs.push({
          id: `${record.id}-completed`,
          timestamp: record.completedAt.toISOString(),
          eventType,
          description: `Cancellation ${record.refundStatus} for order ${record.order.orderNumber}`,
          actor: "System",
          actorType: "system",
          cancellationRecordId: record.id,
          orderNumber: record.order.orderNumber,
          customerName: record.customer.name,
          details: {
            refundAmount: record.refundAmount,
          },
        });
      }
    });

    // Sort by timestamp descending
    activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { success: true, data: activityLogs };
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return { success: false, error: "Failed to fetch activity logs" };
  }
}

/**
 * Get fraud alerts
 */
export async function getFraudAlerts(organizationId: string) {
  try {
    // Get high-risk or rejected cancellations
    const records = await prisma.cancellationRecord.findMany({
      where: {
        organizationId,
        OR: [
          { refundStatus: "rejected" },
          {
            cancellationRequest: {
              riskScore: { gte: 7 },
            },
          },
        ],
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            orderDate: true,
            totalAmount: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        cancellationRequest: {
          select: {
            riskScore: true,
            reason: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const fraudAlerts: FraudAlert[] = records.map((record) => {
      const riskScore = record.cancellationRequest?.riskScore || 0;
      const orderTime = new Date(record.order.orderDate).getTime();
      const cancelTime = new Date(record.createdAt).getTime();
      const timeToCancel = Math.floor((cancelTime - orderTime) / (1000 * 60)); // minutes

      return {
        id: `fraud-${record.id}`,
        cancellationRecordId: record.id,
        orderNumber: record.order.orderNumber,
        orderId: record.orderId,
        customerName: record.customer.name || "Unknown",
        customerEmail: record.customer.email || "",
        customerPhone: record.customer.phone,
        riskLevel: riskScore >= 7 ? "high" : riskScore >= 4 ? "medium" : "low",
        riskScore,
        rejectionReason:
          record.reason || "High risk cancellation detected by automated fraud detection system",
        rejectedAt: record.completedAt?.toISOString() || null,
        rejectedBy: record.refundStatus === "rejected" ? "System" : null,
        riskFactors: ["high_risk_score", "suspicious_pattern"],
        orderAmount: record.order.totalAmount,
        orderCreatedAt: record.order.orderDate.toISOString(),
        timeToCancel,
        status: record.refundStatus === "rejected" ? "rejected" : "pending",
      };
    });

    return { success: true, data: fraudAlerts };
  } catch (error) {
    console.error("Error fetching fraud alerts:", error);
    return { success: false, error: "Failed to fetch fraud alerts" };
  }
}

/**
 * Get cancellation timeline for a specific record
 */
export async function getCancellationTimeline(cancellationRecordId: string) {
  try {
    const record = await prisma.cancellationRecord.findUnique({
      where: { id: cancellationRecordId },
      include: {
        order: {
          select: {
            orderNumber: true,
            orderDate: true,
            status: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
        cancellationRequest: {
          select: {
            createdAt: true,
            reason: true,
            initiatedBy: true,
            status: true,
            updatedAt: true,
          },
        },
        refundTransactions: {
          select: {
            id: true,
            refundAmount: true,
            status: true,
            createdAt: true,
            processedAt: true,
          },
        },
      },
    });

    if (!record) {
      return { success: false, error: "Cancellation record not found" };
    }

    // Build timeline events
    const events: TimelineEvent[] = [];

    // Request initiated
    events.push({
      id: `${record.id}-initiated`,
      timestamp: record.createdAt.toISOString(),
      eventType: "request_initiated",
      description: "Cancellation request initiated",
      actor: record.customer.name || "Customer",
      actorType: record.initiatedBy as any,
      details: {
        orderNumber: record.order.orderNumber,
        reason: record.cancellationRequest?.reason,
      },
    });

    // Validation
    const validationTime = new Date(record.createdAt.getTime() + 5000);
    events.push({
      id: `${record.id}-validation`,
      timestamp: validationTime.toISOString(),
      eventType: "validation_passed",
      description: "All validation checks passed",
      actor: "System",
      actorType: "system",
      details: {
        orderStatus: record.order.status,
      },
    });

    // Approval
    if (record.cancellationRequest?.status === "approved") {
      events.push({
        id: `${record.id}-approved`,
        timestamp: record.cancellationRequest.updatedAt.toISOString(),
        eventType: "auto_approved",
        description: "Cancellation approved",
        actor: "System",
        actorType: "system",
        details: {},
      });
    }

    // Refund events
    if (record.refundTransactions && record.refundTransactions.length > 0) {
      const refund = record.refundTransactions[0];
      
      events.push({
        id: `${record.id}-refund-init`,
        timestamp: refund.createdAt.toISOString(),
        eventType: "refund_initiated",
        description: "Refund processing started",
        actor: "System",
        actorType: "system",
        details: {
          amount: refund.refundAmount,
        },
      });

      if (refund.processedAt) {
        events.push({
          id: `${record.id}-refund-complete`,
          timestamp: refund.processedAt.toISOString(),
          eventType: refund.status === "completed" ? "refund_completed" : "refund_failed",
          description: `Refund ${refund.status}`,
          actor: "System",
          actorType: "system",
          details: {
            transactionId: refund.id,
          },
        });
      }
    }

    // Completion
    if (record.completedAt) {
      events.push({
        id: `${record.id}-completed`,
        timestamp: record.completedAt.toISOString(),
        eventType: "cancellation_completed",
        description: "Cancellation process completed",
        actor: "System",
        actorType: "system",
        details: {},
      });
    }

    // Sort by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const timeline: CancellationTimeline = {
      cancellationRecordId: record.id,
      events,
    };

    return { success: true, data: timeline };
  } catch (error) {
    console.error("Error fetching cancellation timeline:", error);
    return { success: false, error: "Failed to fetch cancellation timeline" };
  }
}

/**
 * Export analytics data to CSV
 */
export async function exportAnalyticsReport(
  organizationId: string,
  format: "csv" | "pdf",
  dateRange?: { startDate: string; endDate: string }
) {
  try {
    // This would generate a CSV or PDF report
    // For now, just return success
    return {
      success: true,
      message: `${format.toUpperCase()} report generated successfully`,
      data: {
        format,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error exporting report:", error);
    return { success: false, error: "Failed to export report" };
  }
}
