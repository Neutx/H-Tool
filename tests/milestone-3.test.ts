/**
 * Milestone 3: Refund Management Tests
 * Tests for refund calculation logic and validation
 */

import { describe, it, expect } from "vitest";
import {
  calculateFullRefund,
  calculatePartialRefund,
  calculateCustomRefund,
  validateRefundAmount,
} from "@/lib/refund-calculator";

describe("Milestone 3: Refund Management", () => {
  const mockOrder = {
    id: "order-1",
    orderNumber: "ORD-1001",
    totalAmount: 2499.0,
    lineItems: [
      {
        id: "item-1",
        title: "Blue T-Shirt",
        quantity: 2,
        price: 999.0,
        totalPrice: 1998.0,
        taxAmount: 359.64,
      },
      {
        id: "item-2",
        title: "Black Jeans",
        quantity: 1,
        price: 1999.0,
        totalPrice: 1999.0,
        taxAmount: 359.82,
      },
    ],
  };

  describe("Full Refund Calculation", () => {
    it("should calculate full refund correctly", () => {
      const result = calculateFullRefund(mockOrder as any);

      expect(result.subtotal).toBe(3997); // 1998 + 1999
      expect(result.taxAmount).toBeCloseTo(719.46, 2); // 359.64 + 359.82
      expect(result.totalRefund).toBe(2499.0);
      expect(result.items).toHaveLength(2);
    });

    it("should include all items in full refund", () => {
      const result = calculateFullRefund(mockOrder as any);

      expect(result.items[0].title).toBe("Blue T-Shirt");
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[1].title).toBe("Black Jeans");
      expect(result.items[1].quantity).toBe(1);
    });
  });

  describe("Partial Refund Calculation", () => {
    it("should calculate partial refund for single item", () => {
      const selectedItems = [
        { lineItemId: "item-1", quantity: 1 },
      ];

      const result = calculatePartialRefund(mockOrder as any, selectedItems);

      expect(result.subtotal).toBe(999.0);
      expect(result.taxAmount).toBeCloseTo(179.82, 2); // 359.64 / 2
      expect(result.items).toHaveLength(1);
    });

    it("should calculate partial refund for multiple items", () => {
      const selectedItems = [
        { lineItemId: "item-1", quantity: 1 },
        { lineItemId: "item-2", quantity: 1 },
      ];

      const result = calculatePartialRefund(mockOrder as any, selectedItems);

      expect(result.subtotal).toBe(2998.0); // 999 + 1999
      expect(result.taxAmount).toBeCloseTo(539.64, 2);
    });

    it("should handle partial quantity refunds", () => {
      const selectedItems = [
        { lineItemId: "item-1", quantity: 1 }, // Only 1 out of 2 t-shirts
      ];

      const result = calculatePartialRefund(mockOrder as any, selectedItems);

      expect(result.items[0].quantity).toBe(1);
      expect(result.items[0].totalPrice).toBe(999.0);
    });

    it("should filter out invalid line item IDs", () => {
      const selectedItems = [
        { lineItemId: "invalid-id", quantity: 1 },
        { lineItemId: "item-1", quantity: 1 },
      ];

      const result = calculatePartialRefund(mockOrder as any, selectedItems);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].lineItemId).toBe("item-1");
    });
  });

  describe("Custom Refund Calculation", () => {
    it("should calculate custom refund amount", () => {
      const customAmount = 1500.0;
      const result = calculateCustomRefund(mockOrder as any, customAmount);

      expect(result.totalRefund).toBe(1500.0);
      expect(result.items).toHaveLength(2);
    });

    it("should distribute custom amount proportionally", () => {
      const customAmount = 1249.5; // Half of total
      const result = calculateCustomRefund(mockOrder as any, customAmount);

      // Each item should get roughly half its value
      const ratio = customAmount / mockOrder.totalAmount;
      expect(result.items[0].totalPrice).toBeCloseTo(1998.0 * ratio, 1);
      expect(result.items[1].totalPrice).toBeCloseTo(1999.0 * ratio, 1);
    });
  });

  describe("Refund Validation", () => {
    it("should accept valid refund amount", () => {
      const validation = validateRefundAmount(1000, mockOrder as any);

      expect(validation.valid).toBe(true);
      expect(validation.maxRefundable).toBe(2499.0);
    });

    it("should reject negative refund amount", () => {
      const validation = validateRefundAmount(-100, mockOrder as any);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it("should reject zero refund amount", () => {
      const validation = validateRefundAmount(0, mockOrder as any);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("greater than 0");
    });

    it("should reject amount exceeding order total", () => {
      const validation = validateRefundAmount(3000, mockOrder as any);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("cannot exceed");
    });

    it("should account for existing refunds", () => {
      const existingRefunds = 1000;
      const validation = validateRefundAmount(
        1000, // Request exactly the remaining amount
        mockOrder as any,
        existingRefunds
      );

      expect(validation.valid).toBe(true);
      expect(validation.maxRefundable).toBe(1499.0); // 2499 - 1000
    });

    it("should reject amount exceeding remaining refundable", () => {
      const existingRefunds = 2000;
      const validation = validateRefundAmount(
        500, // Request 500 but only 499 remains
        mockOrder as any,
        existingRefunds
      );

      expect(validation.valid).toBe(false); // Should be rejected
      expect(validation.error).toContain("cannot exceed");
      expect(validation.maxRefundable).toBe(499.0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle order with no tax", () => {
      const orderNoTax = {
        ...mockOrder,
        lineItems: mockOrder.lineItems.map((item) => ({
          ...item,
          taxAmount: 0,
        })),
      };

      const result = calculateFullRefund(orderNoTax as any);
      expect(result.taxAmount).toBe(0);
    });

    it("should handle single item order", () => {
      const singleItemOrder = {
        ...mockOrder,
        lineItems: [mockOrder.lineItems[0]],
      };

      const result = calculateFullRefund(singleItemOrder as any);
      expect(result.items).toHaveLength(1);
    });

    it("should handle order with shipping", () => {
      // Shipping is currently not extracted from order data
      const result = calculateFullRefund(mockOrder as any);
      expect(result.shippingAmount).toBe(0);
    });
  });
});

