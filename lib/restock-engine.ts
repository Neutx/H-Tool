/**
 * Automatic Restock Rules Engine
 * Determines when and how much to restock products
 */

import type { RestockDecision, RestockStrategy } from "./inventory-types";

export interface RestockRule {
  id: string;
  productId: string;
  minThreshold: number;
  restockQuantity: number;
  maxStockLevel?: number;
  strategy: RestockStrategy;
  locationId: string;
  active: boolean;
  priority: number;
}

export interface StockContext {
  currentStock: number;
  reserved: number;
  damaged: number;
  pendingOrders: number;
  avgDailySales: number;
  leadTimeDays: number;
}

/**
 * Evaluate if a product needs restocking
 */
export function evaluateRestockNeed(
  rule: RestockRule,
  context: StockContext
): RestockDecision {
  const availableStock = context.currentStock - context.reserved;

  // Check if below minimum threshold
  if (availableStock <= rule.minThreshold) {
    const decision = calculateRestockQuantity(rule, context);
    return {
      shouldRestock: rule.strategy === "auto_restock",
      quantity: decision.quantity,
      locationId: rule.locationId,
      reason: decision.reason,
      strategy: rule.strategy,
    };
  }

  return {
    shouldRestock: false,
    quantity: 0,
    locationId: rule.locationId,
    reason: "Stock level above threshold",
    strategy: rule.strategy,
  };
}

/**
 * Calculate optimal restock quantity
 */
export function calculateRestockQuantity(
  rule: RestockRule,
  context: StockContext
): { quantity: number; reason: string } {
  const availableStock = context.currentStock - context.reserved;
  const deficit = rule.minThreshold - availableStock;

  // Method 1: Simple fixed quantity
  if (rule.restockQuantity > 0) {
    return {
      quantity: rule.restockQuantity,
      reason: `Fixed restock quantity (${rule.restockQuantity} units)`,
    };
  }

  // Method 2: Economic Order Quantity (EOQ) approximation
  const leadTimeBuffer = context.avgDailySales * context.leadTimeDays;
  const safetyStock = context.avgDailySales * 7; // 1 week buffer
  const optimalQuantity = Math.ceil(
    deficit + leadTimeBuffer + safetyStock
  );

  // Respect max stock level if set
  if (rule.maxStockLevel && rule.maxStockLevel > 0) {
    const maxToOrder = rule.maxStockLevel - context.currentStock;
    const finalQuantity = Math.min(optimalQuantity, maxToOrder);

    return {
      quantity: Math.max(0, finalQuantity),
      reason: `Calculated EOQ with max stock limit (${finalQuantity} units)`,
    };
  }

  return {
    quantity: Math.max(0, optimalQuantity),
    reason: `Calculated based on sales velocity (${optimalQuantity} units)`,
  };
}

/**
 * Process cancellation and determine restock decision
 */
export function processCancellationRestock(
  productId: string,
  cancelledQuantity: number,
  rules: RestockRule[],
  currentStock: number
): RestockDecision {
  // Find matching rule
  const rule = rules.find(
    (r) => r.productId === productId && r.active
  );

  if (!rule) {
    return {
      shouldRestock: true, // Default to restocking cancelled items
      quantity: cancelledQuantity,
      locationId: "default",
      reason: "No rule found - default restock",
      strategy: "auto_restock",
    };
  }

  // Check strategy
  if (rule.strategy === "no_restock") {
    return {
      shouldRestock: false,
      quantity: 0,
      locationId: rule.locationId,
      reason: "Product configured for no restock",
      strategy: "no_restock",
    };
  }

  // Check if adding back would exceed max stock
  if (rule.maxStockLevel && rule.maxStockLevel > 0) {
    const newStock = currentStock + cancelledQuantity;
    if (newStock > rule.maxStockLevel) {
      const allowedQuantity = Math.max(0, rule.maxStockLevel - currentStock);
      return {
        shouldRestock: rule.strategy === "auto_restock",
        quantity: allowedQuantity,
        locationId: rule.locationId,
        reason: `Partial restock to respect max stock level (${allowedQuantity} of ${cancelledQuantity} units)`,
        strategy: rule.strategy,
      };
    }
  }

  return {
    shouldRestock: rule.strategy === "auto_restock",
    quantity: cancelledQuantity,
    locationId: rule.locationId,
    reason: `Restock cancelled items (${cancelledQuantity} units)`,
    strategy: rule.strategy,
  };
}

/**
 * Batch evaluate multiple products
 */
export function batchEvaluateRestock(
  rules: RestockRule[],
  stockContexts: Map<string, StockContext>
): Map<string, RestockDecision> {
  const decisions = new Map<string, RestockDecision>();

  // Sort by priority (higher first)
  const sortedRules = [...rules]
    .filter((r) => r.active)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    const context = stockContexts.get(rule.productId);
    if (context) {
      const decision = evaluateRestockNeed(rule, context);
      if (decision.shouldRestock) {
        decisions.set(rule.productId, decision);
      }
    }
  }

  return decisions;
}

/**
 * Validate restock rule configuration
 */
export function validateRestockRule(rule: Partial<RestockRule>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!rule.productId) {
    errors.push("Product ID is required");
  }

  if (rule.minThreshold === undefined || rule.minThreshold < 0) {
    errors.push("Minimum threshold must be 0 or greater");
  }

  if (rule.restockQuantity !== undefined && rule.restockQuantity < 0) {
    errors.push("Restock quantity must be 0 or greater");
  }

  if (
    rule.maxStockLevel !== undefined &&
    rule.minThreshold !== undefined &&
    rule.maxStockLevel > 0 &&
    rule.maxStockLevel < rule.minThreshold
  ) {
    errors.push("Max stock level cannot be less than minimum threshold");
  }

  if (rule.priority !== undefined && rule.priority < 0) {
    errors.push("Priority must be 0 or greater");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

