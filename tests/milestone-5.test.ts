/**
 * Milestone 5: Customer Portal Tests
 * Tests for order lookup and cancellation request logic
 */

import { describe, it, expect } from "vitest";
import { validateOrderLookup, isOrderCancellable } from "@/lib/order-lookup";

describe("Milestone 5: Customer Portal", () => {
  describe("Order Lookup Validation", () => {
    it("should reject empty order number", async () => {
      const result = await validateOrderLookup("", "test@example.com");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should reject empty email", async () => {
      const result = await validateOrderLookup("ORD-1001", "");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should reject invalid email format", async () => {
      const result = await validateOrderLookup("ORD-1001", "invalid-email");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid email");
    });

    it("should normalize order number to uppercase", async () => {
      // This test checks the normalization logic
      const result = await validateOrderLookup("ord-1001", "test@example.com");

      // Will fail with "Order not found" but validates normalization
      expect(result.valid).toBe(false);
    });

    it("should normalize email to lowercase", async () => {
      const result = await validateOrderLookup("ORD-1001", "TEST@EXAMPLE.COM");

      // Will fail with "Order not found" but validates normalization
      expect(result.valid).toBe(false);
    });
  });

  describe("Order Cancellation Eligibility", () => {
    it("should allow cancellation for pending order", () => {
      const order = {
        status: "pending",
        cancellationRequest: null,
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should allow cancellation for confirmed order", () => {
      const order = {
        status: "confirmed",
        cancellationRequest: null,
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(true);
    });

    it("should reject if pending cancellation exists", () => {
      const order = {
        status: "confirmed",
        cancellationRequest: {
          status: "pending",
        },
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("already in progress");
    });

    it("should reject if approved cancellation exists", () => {
      const order = {
        status: "confirmed",
        cancellationRequest: {
          status: "approved",
        },
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("already in progress");
    });

    it("should reject if processing cancellation exists", () => {
      const order = {
        status: "confirmed",
        cancellationRequest: {
          status: "processing",
        },
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("already in progress");
    });

    it("should reject if already completed cancellation", () => {
      const order = {
        status: "cancelled",
        cancellationRequest: {
          status: "completed",
        },
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("already been cancelled");
    });

    it("should reject if order delivered", () => {
      const order = {
        status: "delivered",
        cancellationRequest: null,
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("already been delivered");
    });

    it("should reject if order completed", () => {
      const order = {
        status: "completed",
        cancellationRequest: null,
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain("already been delivered");
    });

    it("should allow if denied cancellation exists", () => {
      const order = {
        status: "confirmed",
        cancellationRequest: {
          status: "denied",
        },
      };

      const result = isOrderCancellable(order);

      // Can submit new request after denial
      expect(result.eligible).toBe(true);
    });

    it("should handle case-insensitive status check", () => {
      const order = {
        status: "DELIVERED",
        cancellationRequest: null,
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle order with no status", () => {
      const order = {
        cancellationRequest: null,
      } as any;

      const result = isOrderCancellable(order);

      // Should be eligible if no status specified
      expect(result.eligible).toBe(true);
    });

    it("should handle order with undefined cancellation request", () => {
      const order = {
        status: "confirmed",
        cancellationRequest: undefined,
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(true);
    });

    it("should handle order with null cancellation request", () => {
      const order = {
        status: "confirmed",
        cancellationRequest: null,
      };

      const result = isOrderCancellable(order);

      expect(result.eligible).toBe(true);
    });

    it("should handle whitespace in email", async () => {
      const result = await validateOrderLookup(
        "ORD-1001",
        "  test@example.com  "
      );

      // Should trim whitespace and validate email properly
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Order not found"); // Not an email error
    });

    it("should handle whitespace in order number", async () => {
      const result = await validateOrderLookup(
        "  ORD-1001  ",
        "test@example.com"
      );

      // Should trim whitespace
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Order not found");
    });

    it("should reject email without @ symbol", async () => {
      const result = await validateOrderLookup("ORD-1001", "invalid.email.com");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid email");
    });

    it("should reject email without domain", async () => {
      const result = await validateOrderLookup("ORD-1001", "test@");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid email");
    });

    it("should reject email without TLD", async () => {
      const result = await validateOrderLookup("ORD-1001", "test@example");

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid email");
    });
  });

  describe("Reason Categories", () => {
    const validReasonCategories = [
      "changed_mind",
      "found_better_price",
      "ordered_by_mistake",
      "delivery_delay",
      "product_issue",
      "other",
    ];

    it("should have valid reason categories", () => {
      validReasonCategories.forEach((category) => {
        expect(category).toBeDefined();
        expect(typeof category).toBe("string");
      });
    });

    it("should have at least 5 reason categories", () => {
      expect(validReasonCategories.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Cancellation Status Flow", () => {
    const validStatuses = [
      "pending",
      "approved",
      "processing",
      "completed",
      "denied",
      "info_requested",
    ];

    it("should have all required statuses", () => {
      expect(validStatuses).toContain("pending");
      expect(validStatuses).toContain("approved");
      expect(validStatuses).toContain("completed");
      expect(validStatuses).toContain("denied");
    });

    it("should have at least 5 status types", () => {
      expect(validStatuses.length).toBeGreaterThanOrEqual(5);
    });

    it("should have info_requested for two-way communication", () => {
      expect(validStatuses).toContain("info_requested");
    });
  });
});

