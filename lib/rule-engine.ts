import type {
  CancellationRequest,
  Order,
  Rule,
  RuleConditions,
  RuleActions,
} from "@/lib/types";
import { RiskLevel } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { incrementRuleUsage } from "@/app/actions/rules";

/**
 * Evaluate a cancellation request against all active rules
 * Returns the action to take based on the first matching rule (by priority)
 */
export async function evaluateCancellationRequest(
  cancellationRequestId: string
): Promise<{
  action: "auto_approve" | "manual_review" | "deny" | "escalate";
  matchedRuleId?: string;
  reason?: string;
}> {
  try {
    // Fetch the cancellation request with related data
    const request = await prisma.cancellationRequest.findUnique({
      where: { id: cancellationRequestId },
      include: {
        order: {
          include: {
            lineItems: true,
            customer: true,
          },
        },
        customer: true,
      },
    });

    if (!request) {
      throw new Error("Cancellation request not found");
    }

    // Fetch all active rules for this organization, ordered by priority
    const rules = await prisma.rule.findMany({
      where: {
        organizationId: request.organizationId,
        active: true,
      },
      orderBy: { priority: "asc" },
    });

    // Evaluate rules in priority order
    for (const rule of rules) {
      const matches = await evaluateRuleConditions(
        rule.conditions as any,
        request,
        request.order as any
      );

      if (matches) {
        // Increment usage count asynchronously (don't wait)
        incrementRuleUsage(rule.id);

        const actions = rule.actions as any as RuleActions;
        return {
          action: actions.type,
          matchedRuleId: rule.id,
          reason: `Matched rule: ${rule.name}`,
        };
      }
    }

    // No rule matched - default to manual review for safety
    return {
      action: "manual_review",
      reason: "No matching rule found, defaulting to manual review",
    };
  } catch (error) {
    console.error("Error evaluating cancellation request:", error);
    // On error, default to manual review for safety
    return {
      action: "manual_review",
      reason: "Error during evaluation, defaulting to manual review",
    };
  }
}

/**
 * Evaluate if a cancellation request matches rule conditions
 */
async function evaluateRuleConditions(
  conditions: RuleConditions,
  request: any,
  order: any
): Promise<boolean> {
  // Time window check (in minutes)
  if (conditions.timeWindow !== undefined) {
    const orderDate = new Date(order.orderDate);
    const requestDate = new Date(request.createdAt);
    const minutesDiff =
      (requestDate.getTime() - orderDate.getTime()) / (1000 * 60);

    if (minutesDiff > conditions.timeWindow) {
      return false;
    }
  }

  // User type check
  if (conditions.userType && conditions.userType.length > 0) {
    if (!conditions.userType.includes(request.initiatedBy)) {
      return false;
    }
  }

  // Risk level check
  if (conditions.riskLevel && conditions.riskLevel.length > 0) {
    const requestRiskLevel = calculateRiskLevel(request.riskScore ?? 0);
    if (!conditions.riskLevel.includes(requestRiskLevel)) {
      return false;
    }
  }

  // Order status check
  if (conditions.orderStatus && conditions.orderStatus.length > 0) {
    if (!conditions.orderStatus.includes(order.status)) {
      return false;
    }
  }

  // Fulfillment status check
  if (conditions.fulfillmentStatus && conditions.fulfillmentStatus.length > 0) {
    if (!conditions.fulfillmentStatus.includes(order.fulfillmentStatus)) {
      return false;
    }
  }

  // Payment status check
  if (conditions.paymentStatus && conditions.paymentStatus.length > 0) {
    if (!conditions.paymentStatus.includes(order.paymentStatus)) {
      return false;
    }
  }

  // Min order amount check
  if (conditions.minOrderAmount !== undefined) {
    if (order.totalAmount < conditions.minOrderAmount) {
      return false;
    }
  }

  // Max order amount check
  if (conditions.maxOrderAmount !== undefined) {
    if (order.totalAmount > conditions.maxOrderAmount) {
      return false;
    }
  }

  // All conditions passed
  return true;
}

/**
 * Calculate risk level from risk score
 */
function calculateRiskLevel(riskScore: number): RiskLevel {
  if (riskScore >= 0.7) return RiskLevel.HIGH;
  if (riskScore >= 0.4) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

/**
 * Calculate risk score for a cancellation request
 * Returns a score between 0 (low risk) and 1 (high risk)
 */
export async function calculateRiskScore(
  cancellationRequestId: string
): Promise<number> {
  try {
    const request = await prisma.cancellationRequest.findUnique({
      where: { id: cancellationRequestId },
      include: {
        customer: true,
        order: true,
      },
    });

    if (!request) {
      return 0.5; // Default medium risk
    }

    let riskScore = 0;

    // Factor 1: Customer history
    const customerOrders = await prisma.order.findMany({
      where: { customerId: request.customerId },
    });

    const customerCancellations = await prisma.cancellationRequest.findMany({
      where: { customerId: request.customerId },
    });

    const cancellationRate =
      customerOrders.length > 0
        ? customerCancellations.length / customerOrders.length
        : 0;

    // High cancellation rate increases risk
    riskScore += cancellationRate * 0.3;

    // Factor 2: Order amount
    // Very high value orders have slightly higher risk
    if (request.order.totalAmount > 50000) {
      riskScore += 0.1;
    }

    // Factor 3: Time since order
    const orderDate = new Date(request.order.orderDate);
    const requestDate = new Date(request.createdAt);
    const hoursSinceOrder =
      (requestDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);

    // Cancellations very soon after order are lower risk
    if (hoursSinceOrder < 0.5) {
      riskScore -= 0.1;
    }

    // Factor 4: Reason category
    const suspiciousReasons = [
      "found_better_price",
      "no_longer_needed",
      "ordered_by_mistake",
    ];
    if (!suspiciousReasons.includes(request.reasonCategory)) {
      riskScore += 0.1;
    }

    // Factor 5: Multiple recent cancellations from same customer
    const recentCancellations = await prisma.cancellationRequest.findMany({
      where: {
        customerId: request.customerId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    if (recentCancellations.length >= 3) {
      riskScore += 0.3;
    }

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, riskScore));
  } catch (error) {
    console.error("Error calculating risk score:", error);
    return 0.5; // Default medium risk
  }
}

/**
 * Process a cancellation request through the rule engine
 * Creates review queue item if needed
 */
export async function processCancellationRequest(
  cancellationRequestId: string
): Promise<{
  success: boolean;
  action: string;
  message: string;
}> {
  try {
    // Calculate risk score
    const riskScore = await calculateRiskScore(cancellationRequestId);

    // Update request with risk score
    await prisma.cancellationRequest.update({
      where: { id: cancellationRequestId },
      data: { riskScore },
    });

    // Evaluate against rules
    const result = await evaluateCancellationRequest(cancellationRequestId);

    // Take action based on result
    if (result.action === "auto_approve") {
      // Auto-approve the request
      await prisma.cancellationRequest.update({
        where: { id: cancellationRequestId },
        data: { status: "approved" },
      });

      return {
        success: true,
        action: "auto_approved",
        message: "Cancellation automatically approved",
      };
    } else if (result.action === "deny") {
      // Auto-deny the request
      await prisma.cancellationRequest.update({
        where: { id: cancellationRequestId },
        data: { status: "denied" },
      });

      return {
        success: true,
        action: "denied",
        message: "Cancellation automatically denied",
      };
    } else {
      // Manual review or escalate - add to review queue
      const request = await prisma.cancellationRequest.findUnique({
        where: { id: cancellationRequestId },
        include: { customer: true },
      });

      if (!request) {
        throw new Error("Request not found");
      }

      // Calculate customer history for review context
      const customerOrders = await prisma.order.findMany({
        where: { customerId: request.customerId },
        take: 10,
        orderBy: { orderDate: "desc" },
      });

      const customerCancellations = await prisma.cancellationRequest.findMany({
        where: { customerId: request.customerId },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      const riskLevel = calculateRiskLevel(riskScore);

      // Create review queue item
      await prisma.reviewQueueItem.create({
        data: {
          cancellationRequestId,
          orderId: request.orderId,
          riskLevel,
          riskIndicators: {
            riskScore,
            matchedRule: result.matchedRuleId,
            reason: result.reason,
          },
          customerHistory: {
            totalOrders: customerOrders.length,
            totalCancellations: customerCancellations.length,
            recentOrders: customerOrders.map((o) => ({
              orderNumber: o.orderNumber,
              amount: o.totalAmount,
              date: o.orderDate,
            })),
          },
          reviewStatus: "pending",
        },
      });

      return {
        success: true,
        action: result.action,
        message: "Cancellation request added to review queue",
      };
    }
  } catch (error) {
    console.error("Error processing cancellation request:", error);
    return {
      success: false,
      action: "error",
      message: "Failed to process cancellation request",
    };
  }
}

