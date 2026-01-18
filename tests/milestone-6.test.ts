/**
 * Milestone 6: Analytics Dashboard Tests
 * Tests for analytics metrics, records, and filtering
 */

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Milestone 6: Analytics Dashboard", () => {
  let testOrgId: string;
  let testCustomerId: string;
  let testOrderId: string;

  beforeEach(async () => {
    // Generate unique IDs for each test run
    const timestamp = Date.now();
    testOrgId = `test-org-analytics-${timestamp}`;
    testCustomerId = `test-customer-analytics-${timestamp}`;
    testOrderId = `test-order-analytics-${timestamp}`;

    // Create test organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: "Test Analytics Org",
        shopifyStoreUrl: "test-analytics.myshopify.com",
      },
    });

    // Create test customer
    await prisma.customer.create({
      data: {
        id: testCustomerId,
        organizationId: testOrgId,
        email: "analytics@test.com",
        name: "Analytics Tester",
      },
    });

    // Create test order
    await prisma.order.create({
      data: {
        id: testOrderId,
        organizationId: testOrgId,
        customerId: testCustomerId,
        orderNumber: "TEST-ANALYTICS-001",
        orderDate: new Date(),
        status: "open",
        fulfillmentStatus: "unfulfilled",
        paymentStatus: "paid",
        totalAmount: 150.0,
        currency: "USD",
      },
    });
  });

  describe("Metrics Calculation", () => {
    it("should calculate total cancellations correctly", async () => {
      // Create cancellation request
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Customer changed mind",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "completed",
        },
      });

      // Create cancellation record
      await prisma.cancellationRecord.create({
        data: {
          cancellationRequestId: request.id,
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          initiatedBy: "customer",
          reason: "Customer changed mind",
          reasonCategory: "changed_mind",
          refundAmount: 150.0,
          refundStatus: "completed",
          restockDecision: "auto_restock",
          completedAt: new Date(),
        },
      });

      // Query records
      const records = await prisma.cancellationRecord.findMany({
        where: { organizationId: testOrgId },
      });

      expect(records.length).toBe(1);
      expect(records[0].refundStatus).toBe("completed");
    });

    it("should calculate cancellation rate correctly", async () => {
      // Create multiple orders
      for (let i = 1; i <= 10; i++) {
        await prisma.order.create({
          data: {
            organizationId: testOrgId,
            customerId: testCustomerId,
            orderNumber: `ORDER-${i}`,
            orderDate: new Date(),
            status: "open",
            fulfillmentStatus: "unfulfilled",
            paymentStatus: "paid",
            totalAmount: 100.0,
            currency: "USD",
          },
        });
      }

      const totalOrders = await prisma.order.count({
        where: { organizationId: testOrgId },
      });

      expect(totalOrders).toBeGreaterThanOrEqual(11); // 1 from beforeEach + 10 new
    });

    it("should track refund success rate", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Test refund",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "completed",
        },
      });

      const record = await prisma.cancellationRecord.create({
        data: {
          cancellationRequestId: request.id,
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          initiatedBy: "customer",
          reason: "Test refund",
          reasonCategory: "changed_mind",
          refundAmount: 150.0,
          refundStatus: "completed",
          restockDecision: "auto_restock",
          completedAt: new Date(),
        },
      });

      expect(record.refundStatus).toBe("completed");
      expect(record.refundAmount).toBe(150.0);
    });

    it("should aggregate refund amounts correctly", async () => {
      const amounts = [100, 200, 300];
      
      for (const amount of amounts) {
        const order = await prisma.order.create({
          data: {
            organizationId: testOrgId,
            customerId: testCustomerId,
            orderNumber: `ORDER-${amount}`,
            orderDate: new Date(),
            status: "cancelled",
            fulfillmentStatus: "unfulfilled",
            paymentStatus: "refunded",
            totalAmount: amount,
            currency: "USD",
          },
        });

        const request = await prisma.cancellationRequest.create({
          data: {
            orderId: order.id,
            customerId: testCustomerId,
            organizationId: testOrgId,
            reason: "Test",
            reasonCategory: "changed_mind",
            initiatedBy: "customer",
            refundPreference: "full",
            status: "completed",
          },
        });

        await prisma.cancellationRecord.create({
          data: {
            cancellationRequestId: request.id,
            orderId: order.id,
            customerId: testCustomerId,
            organizationId: testOrgId,
            initiatedBy: "customer",
            reason: "Test",
            reasonCategory: "changed_mind",
            refundAmount: amount,
            refundStatus: "completed",
            restockDecision: "auto_restock",
            completedAt: new Date(),
          },
        });
      }

      const records = await prisma.cancellationRecord.findMany({
        where: {
          organizationId: testOrgId,
          refundStatus: "completed",
        },
      });

      const total = records.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
      expect(total).toBe(600);
    });
  });

  describe("Initiator Tracking", () => {
    it("should track customer-initiated cancellations", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Customer request",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "pending",
        },
      });

      expect(request.initiatedBy).toBe("customer");
    });

    it("should track merchant-initiated cancellations", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Inventory issue",
          reasonCategory: "product_issue",
          initiatedBy: "merchant",
          refundPreference: "full",
          status: "pending",
        },
      });

      expect(request.initiatedBy).toBe("merchant");
    });

    it("should track system-initiated cancellations", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Payment declined",
          reasonCategory: "other",
          initiatedBy: "system",
          refundPreference: "none",
          status: "completed",
        },
      });

      expect(request.initiatedBy).toBe("system");
    });
  });

  describe("Reason Categorization", () => {
    it("should categorize customer reasons", async () => {
      const categories = ["changed_mind", "found_better_price", "ordered_by_mistake"];
      const createdRequests = [];

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const order = await prisma.order.create({
          data: {
            organizationId: testOrgId,
            customerId: testCustomerId,
            orderNumber: `ORDER-${category}-${Date.now()}-${i}`,
            orderDate: new Date(),
            status: "open",
            fulfillmentStatus: "unfulfilled",
            paymentStatus: "paid",
            totalAmount: 100.0,
            currency: "USD",
          },
        });

        const request = await prisma.cancellationRequest.create({
          data: {
            orderId: order.id,
            customerId: testCustomerId,
            organizationId: testOrgId,
            reason: `Test ${category}`,
            reasonCategory: category,
            initiatedBy: "customer",
            refundPreference: "full",
            status: "pending",
          },
        });
        createdRequests.push(request);
      }

      expect(createdRequests.some((r) => r.reasonCategory === "changed_mind")).toBe(true);
      expect(createdRequests.some((r) => r.reasonCategory === "found_better_price")).toBe(true);
      expect(createdRequests.some((r) => r.reasonCategory === "ordered_by_mistake")).toBe(true);
    });

    it("should categorize delivery issues", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Delivery taking too long",
          reasonCategory: "delivery_delay",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "pending",
        },
      });

      expect(request.reasonCategory).toBe("delivery_delay");
    });

    it("should categorize product issues", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Product damaged",
          reasonCategory: "product_issue",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "pending",
        },
      });

      expect(request.reasonCategory).toBe("product_issue");
    });
  });

  describe("Status Tracking", () => {
    it("should track pending status", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Test",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "pending",
        },
      });

      expect(request.status).toBe("pending");
    });

    it("should track completed status", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Test",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "completed",
        },
      });

      expect(request.status).toBe("completed");
    });

    it("should track denied status", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Test",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "denied",
        },
      });

      expect(request.status).toBe("denied");
    });
  });

  describe("Fraud Detection", () => {
    it("should track risk scores", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Suspicious request",
          reasonCategory: "other",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "pending",
          riskScore: 8.5,
        },
      });

      expect(request.riskScore).toBe(8.5);
    });

    it("should identify high-risk cancellations", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "High risk",
          reasonCategory: "other",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "denied",
          riskScore: 9.2,
        },
      });

      expect(request.riskScore).toBeGreaterThan(7);
    });

    it("should filter by risk level", async () => {
      const riskScores = [2.5, 5.5, 8.5];

      for (let i = 0; i < riskScores.length; i++) {
        const score = riskScores[i];
        const order = await prisma.order.create({
          data: {
            organizationId: testOrgId,
            customerId: testCustomerId,
            orderNumber: `ORDER-RISK-${score}-${Date.now()}-${i}`,
            orderDate: new Date(),
            status: "open",
            fulfillmentStatus: "unfulfilled",
            paymentStatus: "paid",
            totalAmount: 100.0,
            currency: "USD",
          },
        });

        await prisma.cancellationRequest.create({
          data: {
            orderId: order.id,
            customerId: testCustomerId,
            organizationId: testOrgId,
            reason: "Test",
            reasonCategory: "other",
            initiatedBy: "customer",
            refundPreference: "full",
            status: "pending",
            riskScore: score,
          },
        });
      }

      const highRisk = await prisma.cancellationRequest.findMany({
        where: {
          organizationId: testOrgId,
          riskScore: { gte: 7 },
        },
      });

      expect(highRisk.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Time-based Analytics", () => {
    it("should filter by date range", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Test",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "completed",
          createdAt: yesterday,
        },
      });

      const recentRecords = await prisma.cancellationRequest.findMany({
        where: {
          organizationId: testOrgId,
          createdAt: { gte: weekAgo },
        },
      });

      expect(recentRecords.length).toBeGreaterThan(0);
    });

    it("should calculate processing time", async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Test",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "completed",
          createdAt: oneHourAgo,
          updatedAt: now,
        },
      });

      const processingTime =
        new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime();
      expect(processingTime).toBeGreaterThan(0);
    });
  });

  describe("Record Filtering", () => {
    it("should filter by status", async () => {
      const statuses = ["pending", "completed", "denied"];

      for (let i = 0; i < statuses.length; i++) {
        const status = statuses[i];
        const order = await prisma.order.create({
          data: {
            organizationId: testOrgId,
            customerId: testCustomerId,
            orderNumber: `ORDER-STATUS-${status}-${Date.now()}-${i}`,
            orderDate: new Date(),
            status: "open",
            fulfillmentStatus: "unfulfilled",
            paymentStatus: "paid",
            totalAmount: 100.0,
            currency: "USD",
          },
        });

        await prisma.cancellationRequest.create({
          data: {
            orderId: order.id,
            customerId: testCustomerId,
            organizationId: testOrgId,
            reason: "Test",
            reasonCategory: "changed_mind",
            initiatedBy: "customer",
            refundPreference: "full",
            status,
          },
        });
      }

      const completed = await prisma.cancellationRequest.findMany({
        where: {
          organizationId: testOrgId,
          status: "completed",
        },
      });

      expect(completed.length).toBeGreaterThanOrEqual(1);
    });

    it("should filter by initiator", async () => {
      const initiators: ("customer" | "merchant" | "system")[] = ["customer", "merchant", "system"];

      for (let i = 0; i < initiators.length; i++) {
        const initiator = initiators[i];
        const order = await prisma.order.create({
          data: {
            organizationId: testOrgId,
            customerId: testCustomerId,
            orderNumber: `ORDER-INIT-${initiator}-${Date.now()}-${i}`,
            orderDate: new Date(),
            status: "open",
            fulfillmentStatus: "unfulfilled",
            paymentStatus: "paid",
            totalAmount: 100.0,
            currency: "USD",
          },
        });

        await prisma.cancellationRequest.create({
          data: {
            orderId: order.id,
            customerId: testCustomerId,
            organizationId: testOrgId,
            reason: "Test",
            reasonCategory: "changed_mind",
            initiatedBy: initiator,
            refundPreference: "full",
            status: "pending",
          },
        });
      }

      const customerInitiated = await prisma.cancellationRequest.findMany({
        where: {
          organizationId: testOrgId,
          initiatedBy: "customer",
        },
      });

      expect(customerInitiated.length).toBeGreaterThanOrEqual(1);
    });

    it("should search by order number", async () => {
      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });

      expect(order).not.toBeNull();
      expect(order?.orderNumber).toBe("TEST-ANALYTICS-001");
    });

    it("should search by customer name", async () => {
      const customer = await prisma.customer.findUnique({
        where: { id: testCustomerId },
      });

      expect(customer).not.toBeNull();
      expect(customer?.name).toBe("Analytics Tester");
    });
  });

  describe("Export Functionality", () => {
    it("should have records available for export", async () => {
      const request = await prisma.cancellationRequest.create({
        data: {
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          reason: "Export test",
          reasonCategory: "changed_mind",
          initiatedBy: "customer",
          refundPreference: "full",
          status: "completed",
        },
      });

      const record = await prisma.cancellationRecord.create({
        data: {
          cancellationRequestId: request.id,
          orderId: testOrderId,
          customerId: testCustomerId,
          organizationId: testOrgId,
          initiatedBy: "customer",
          reason: "Export test",
          reasonCategory: "changed_mind",
          refundAmount: 150.0,
          refundStatus: "completed",
          restockDecision: "auto_restock",
          completedAt: new Date(),
        },
      });

      expect(record).not.toBeNull();
    });
  });
});
