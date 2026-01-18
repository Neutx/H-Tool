/**
 * Milestone 4: Inventory Control Tests
 * Tests for restock engine logic and validation
 */

import { describe, it, expect } from "vitest";
import {
  evaluateRestockNeed,
  calculateRestockQuantity,
  processCancellationRestock,
  batchEvaluateRestock,
  validateRestockRule,
} from "@/lib/restock-engine";
import type { RestockRule, StockContext } from "@/lib/restock-engine";

describe("Milestone 4: Inventory Control", () => {
  const mockRule: RestockRule = {
    id: "rule-1",
    productId: "prod-1",
    minThreshold: 10,
    restockQuantity: 50,
    maxStockLevel: 200,
    strategy: "auto_restock",
    locationId: "WH001",
    active: true,
    priority: 1,
  };

  const mockContext: StockContext = {
    currentStock: 5,
    reserved: 0,
    damaged: 0,
    pendingOrders: 3,
    avgDailySales: 2,
    leadTimeDays: 5,
  };

  describe("Evaluate Restock Need", () => {
    it("should trigger restock when below threshold", () => {
      const decision = evaluateRestockNeed(mockRule, mockContext);

      expect(decision.shouldRestock).toBe(true);
      expect(decision.strategy).toBe("auto_restock");
      expect(decision.locationId).toBe("WH001");
    });

    it("should not trigger restock when above threshold", () => {
      const context = { ...mockContext, currentStock: 20 };
      const decision = evaluateRestockNeed(mockRule, context);

      expect(decision.shouldRestock).toBe(false);
      expect(decision.reason).toContain("above threshold");
    });

    it("should respect manual review strategy", () => {
      const rule = { ...mockRule, strategy: "manual_review" as const };
      const decision = evaluateRestockNeed(rule, mockContext);

      expect(decision.shouldRestock).toBe(false);
      expect(decision.strategy).toBe("manual_review");
    });

    it("should handle no_restock strategy", () => {
      const rule = { ...mockRule, strategy: "no_restock" as const };
      const decision = evaluateRestockNeed(rule, mockContext);

      expect(decision.shouldRestock).toBe(false);
      expect(decision.strategy).toBe("no_restock");
    });

    it("should account for reserved stock", () => {
      const context = { ...mockContext, currentStock: 15, reserved: 10 };
      const decision = evaluateRestockNeed(mockRule, context);

      // Available = 15 - 10 = 5, which is below threshold of 10
      expect(decision.shouldRestock).toBe(true);
    });
  });

  describe("Calculate Restock Quantity", () => {
    it("should use fixed quantity when specified", () => {
      const rule = { ...mockRule, restockQuantity: 75 };
      const result = calculateRestockQuantity(rule, mockContext);

      expect(result.quantity).toBe(75);
      expect(result.reason).toContain("Fixed restock quantity");
    });

    it("should calculate EOQ when no fixed quantity", () => {
      const rule = { ...mockRule, restockQuantity: 0 };
      const result = calculateRestockQuantity(rule, mockContext);

      expect(result.quantity).toBeGreaterThan(0);
      expect(result.reason).toContain("Calculated");
    });

    it("should respect max stock level", () => {
      const rule = {
        ...mockRule,
        restockQuantity: 0,
        maxStockLevel: 30,
      };
      const context = { ...mockContext, currentStock: 25 };
      const result = calculateRestockQuantity(rule, context);

      // Should not exceed max (30 - 25 = 5 max)
      expect(result.quantity).toBeLessThanOrEqual(5);
    });

    it("should include lead time buffer", () => {
      const context = {
        ...mockContext,
        avgDailySales: 5,
        leadTimeDays: 7,
      };
      const rule = { ...mockRule, restockQuantity: 0 };
      const result = calculateRestockQuantity(rule, context);

      // Lead time buffer = 5 * 7 = 35
      // Safety stock = 5 * 7 = 35
      // Should be at least deficit + buffers
      expect(result.quantity).toBeGreaterThan(35);
    });

    it("should not return negative quantity", () => {
      const rule = {
        ...mockRule,
        maxStockLevel: 5,
      };
      const context = { ...mockContext, currentStock: 10 };
      const result = calculateRestockQuantity(rule, context);

      expect(result.quantity).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Process Cancellation Restock", () => {
    it("should default to restock when no rule exists", () => {
      const decision = processCancellationRestock(
        "prod-1",
        5,
        [],
        10
      );

      expect(decision.shouldRestock).toBe(true);
      expect(decision.quantity).toBe(5);
      expect(decision.reason).toContain("default restock");
    });

    it("should respect auto_restock strategy", () => {
      const decision = processCancellationRestock(
        "prod-1",
        5,
        [mockRule],
        10
      );

      expect(decision.shouldRestock).toBe(true);
      expect(decision.quantity).toBe(5);
      expect(decision.strategy).toBe("auto_restock");
    });

    it("should respect no_restock strategy", () => {
      const rule = { ...mockRule, strategy: "no_restock" as const };
      const decision = processCancellationRestock(
        "prod-1",
        5,
        [rule],
        10
      );

      expect(decision.shouldRestock).toBe(false);
      expect(decision.quantity).toBe(0);
      expect(decision.reason).toContain("no restock");
    });

    it("should respect max stock level", () => {
      const rule = { ...mockRule, maxStockLevel: 50 };
      const decision = processCancellationRestock(
        "prod-1",
        10,
        [rule],
        45
      );

      // Can only add 5 more (50 - 45)
      expect(decision.quantity).toBe(5);
      expect(decision.reason).toContain("Partial restock");
    });

    it("should not exceed max stock level", () => {
      const rule = { ...mockRule, maxStockLevel: 50 };
      const decision = processCancellationRestock(
        "prod-1",
        10,
        [rule],
        50
      );

      // Already at max
      expect(decision.quantity).toBe(0);
    });

    it("should handle manual_review strategy", () => {
      const rule = { ...mockRule, strategy: "manual_review" as const };
      const decision = processCancellationRestock(
        "prod-1",
        5,
        [rule],
        10
      );

      expect(decision.shouldRestock).toBe(false);
      expect(decision.strategy).toBe("manual_review");
    });
  });

  describe("Batch Evaluate Restock", () => {
    it("should evaluate multiple rules", () => {
      const rules: RestockRule[] = [
        { ...mockRule, productId: "prod-1" },
        { ...mockRule, id: "rule-2", productId: "prod-2" },
      ];

      const contexts = new Map<string, StockContext>([
        ["prod-1", { ...mockContext, currentStock: 5 }],
        ["prod-2", { ...mockContext, currentStock: 20 }],
      ]);

      const decisions = batchEvaluateRestock(rules, contexts);

      expect(decisions.size).toBe(1); // Only prod-1 needs restock
      expect(decisions.has("prod-1")).toBe(true);
      expect(decisions.has("prod-2")).toBe(false);
    });

    it("should respect priority order", () => {
      const rules: RestockRule[] = [
        { ...mockRule, priority: 1, productId: "prod-1" },
        { ...mockRule, id: "rule-2", priority: 5, productId: "prod-2" },
        { ...mockRule, id: "rule-3", priority: 3, productId: "prod-3" },
      ];

      const contexts = new Map<string, StockContext>([
        ["prod-1", { ...mockContext, currentStock: 5 }],
        ["prod-2", { ...mockContext, currentStock: 5 }],
        ["prod-3", { ...mockContext, currentStock: 5 }],
      ]);

      const decisions = batchEvaluateRestock(rules, contexts);

      // All should trigger restock
      expect(decisions.size).toBe(3);
    });

    it("should skip inactive rules", () => {
      const rules: RestockRule[] = [
        { ...mockRule, active: false, productId: "prod-1" },
        { ...mockRule, id: "rule-2", active: true, productId: "prod-2" },
      ];

      const contexts = new Map<string, StockContext>([
        ["prod-1", { ...mockContext, currentStock: 5 }],
        ["prod-2", { ...mockContext, currentStock: 5 }],
      ]);

      const decisions = batchEvaluateRestock(rules, contexts);

      expect(decisions.size).toBe(1);
      expect(decisions.has("prod-2")).toBe(true);
    });

    it("should handle missing context", () => {
      const rules: RestockRule[] = [
        { ...mockRule, productId: "prod-1" },
      ];

      const contexts = new Map<string, StockContext>();

      const decisions = batchEvaluateRestock(rules, contexts);

      expect(decisions.size).toBe(0);
    });
  });

  describe("Validate Restock Rule", () => {
    it("should accept valid rule", () => {
      const result = validateRestockRule(mockRule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing productId", () => {
      const rule = { ...mockRule, productId: undefined as any };
      const result = validateRestockRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Product ID"))).toBe(true);
    });

    it("should reject negative min threshold", () => {
      const rule = { ...mockRule, minThreshold: -5 };
      const result = validateRestockRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("threshold"))).toBe(true);
    });

    it("should reject negative restock quantity", () => {
      const rule = { ...mockRule, restockQuantity: -10 };
      const result = validateRestockRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("quantity"))).toBe(true);
    });

    it("should reject max less than min", () => {
      const rule = {
        ...mockRule,
        minThreshold: 50,
        maxStockLevel: 30,
      };
      const result = validateRestockRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Max stock"))).toBe(true);
    });

    it("should reject negative priority", () => {
      const rule = { ...mockRule, priority: -1 };
      const result = validateRestockRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Priority"))).toBe(true);
    });

    it("should allow max = 0 (no limit)", () => {
      const rule = { ...mockRule, maxStockLevel: 0 };
      const result = validateRestockRule(rule);

      expect(result.valid).toBe(true);
    });

    it("should accumulate multiple errors", () => {
      const rule = {
        ...mockRule,
        productId: undefined as any,
        minThreshold: -5,
        restockQuantity: -10,
      };
      const result = validateRestockRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero stock", () => {
      const context = { ...mockContext, currentStock: 0 };
      const decision = evaluateRestockNeed(mockRule, context);

      expect(decision.shouldRestock).toBe(true);
      expect(decision.quantity).toBeGreaterThan(0);
    });

    it("should handle large stock numbers", () => {
      const rule = {
        ...mockRule,
        minThreshold: 1000,
        restockQuantity: 5000,
      };
      const context = { ...mockContext, currentStock: 500 };
      const decision = evaluateRestockNeed(rule, context);

      expect(decision.shouldRestock).toBe(true);
      expect(decision.quantity).toBeGreaterThan(0);
    });

    it("should handle exactly at threshold", () => {
      const context = { ...mockContext, currentStock: 10 };
      const decision = evaluateRestockNeed(mockRule, context);

      // At threshold should trigger
      expect(decision.shouldRestock).toBe(true);
    });

    it("should handle all stock reserved", () => {
      const context = {
        ...mockContext,
        currentStock: 20,
        reserved: 20,
      };
      const decision = evaluateRestockNeed(mockRule, context);

      // 20 - 20 = 0 available, below threshold
      expect(decision.shouldRestock).toBe(true);
    });
  });
});

