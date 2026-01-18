import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing data in development
  if (process.env.NODE_ENV !== "production") {
    console.log("🧹 Cleaning existing data...");
    await prisma.orderStatusUpdate.deleteMany();
    await prisma.integrationSync.deleteMany();
    await prisma.failedSync.deleteMany();
    await prisma.integration.deleteMany();
    await prisma.reviewQueueItem.deleteMany();
    await prisma.refundTransaction.deleteMany();
    await prisma.cancellationRecord.deleteMany();
    await prisma.cancellationRequest.deleteMany();
    await prisma.productRestockRule.deleteMany();
    await prisma.inventoryAdjustment.deleteMany();
    await prisma.lineItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.rule.deleteMany();
    await prisma.ruleTemplate.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
  }

  // 1. Create Organization
  console.log("📦 Creating organization...");
  const organization = await prisma.organization.create({
    data: {
      name: "Demo Store",
      shopifyStoreUrl: "demo-store.myshopify.com",
      hasShopifyDomain: true,
    },
  });

  // 2. Create Admin User
  console.log("👤 Creating admin user...");
  const adminUser = await prisma.user.create({
    data: {
      firebaseUid: "demo-admin-uid",
      email: "admin@htool.com",
      name: "Admin User",
    },
  });

  // 3. Create Team Member
  await prisma.teamMember.create({
    data: {
      role: "admin",
      userId: adminUser.id,
      organizationId: organization.id,
    },
  });

  // 4. Create Rule Templates
  console.log("📋 Creating rule templates...");
  const templates = await Promise.all([
    prisma.ruleTemplate.create({
      data: {
        name: "Auto-approve within 15 min",
        description: "Automatically approve cancellations requested within 15 minutes of order placement",
        category: "time_based",
        conditions: {
          timeWindow: 15,
          orderStatus: ["open", "pending"],
          fulfillmentStatus: ["unfulfilled"],
        },
        actions: {
          type: "auto_approve",
          notifyCustomer: true,
        },
        recommended: true,
      },
    }),
    prisma.ruleTemplate.create({
      data: {
        name: "Flag high-risk orders",
        description: "Send high-risk cancellation requests to manual review",
        category: "risk_based",
        conditions: {
          riskLevel: ["high"],
        },
        actions: {
          type: "manual_review",
          notifyMerchant: true,
        },
        recommended: true,
      },
    }),
    prisma.ruleTemplate.create({
      data: {
        name: "Deny if already fulfilled",
        description: "Automatically deny cancellations for already fulfilled orders",
        category: "status_based",
        conditions: {
          fulfillmentStatus: ["fulfilled"],
        },
        actions: {
          type: "deny",
          notifyCustomer: true,
        },
        recommended: true,
      },
    }),
  ]);

  // 5. Create Active Rules
  console.log("⚙️ Creating active rules...");
  await prisma.rule.create({
    data: {
      name: "Auto-approve within 15 min",
      description: "Automatically approve cancellations within 15 minutes",
      organizationId: organization.id,
      conditions: {
        timeWindow: 15,
        orderStatus: ["open", "pending"],
        fulfillmentStatus: ["unfulfilled"],
      },
      actions: {
        type: "auto_approve",
        notifyCustomer: true,
      },
      priority: 1,
      active: true,
      usageCount: 42,
      createdFromTemplateId: templates[0].id,
    },
  });

  // 6. Create Customers
  console.log("👥 Creating customers...");
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        shopifyCustomerId: "7234567890123",
        email: "john.doe@example.com",
        phone: "+919876543210",
        name: "John Doe",
        organizationId: organization.id,
      },
    }),
    prisma.customer.create({
      data: {
        shopifyCustomerId: "7234567890124",
        email: "jane.smith@example.com",
        phone: "+919876543211",
        name: "Jane Smith",
        organizationId: organization.id,
      },
    }),
  ]);

  // 7. Create Products
  console.log("📦 Creating products...");
  const products = await Promise.all([
    prisma.product.create({
      data: {
        shopifyProductId: "8234567890123",
        sku: "TSHIRT-BLU-M",
        name: "Blue T-Shirt - Medium",
        currentStock: 50,
        availabilityStatus: "in_stock",
        organizationId: organization.id,
      },
    }),
    prisma.product.create({
      data: {
        shopifyProductId: "8234567890124",
        sku: "JEANS-BLK-32",
        name: "Black Jeans - 32",
        currentStock: 25,
        availabilityStatus: "in_stock",
        organizationId: organization.id,
      },
    }),
    prisma.product.create({
      data: {
        shopifyProductId: "8234567890125",
        sku: "SHOES-WHT-10",
        name: "White Sneakers - Size 10",
        currentStock: 0,
        availabilityStatus: "out_of_stock",
        organizationId: organization.id,
      },
    }),
  ]);

  // 8. Create Orders
  console.log("🛍️ Creating orders...");
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        shopifyOrderId: "6234567890123",
        orderNumber: "ORD-1001",
        status: "open",
        fulfillmentStatus: "unfulfilled",
        paymentStatus: "paid",
        totalAmount: 2499.0,
        currency: "INR",
        customerId: customers[0].id,
        organizationId: organization.id,
        orderDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        shippingAddress: {
          name: "John Doe",
          address1: "123 Main Street",
          city: "Mumbai",
          province: "Maharashtra",
          zip: "400001",
          country: "India",
        },
        lineItems: {
          create: [
            {
              shopifyLineItemId: "9234567890123",
              productId: products[0].id,
              sku: "TSHIRT-BLU-M",
              title: "Blue T-Shirt - Medium",
              quantity: 2,
              price: 999.0,
              totalPrice: 1998.0,
              taxAmount: 359.64,
            },
            {
              shopifyLineItemId: "9234567890124",
              productId: products[1].id,
              sku: "JEANS-BLK-32",
              title: "Black Jeans - 32",
              quantity: 1,
              price: 1999.0,
              totalPrice: 1999.0,
              taxAmount: 359.82,
            },
          ],
        },
      },
      include: {
        lineItems: true,
      },
    }),
    prisma.order.create({
      data: {
        shopifyOrderId: "6234567890124",
        orderNumber: "ORD-1002",
        status: "pending",
        fulfillmentStatus: "unfulfilled",
        paymentStatus: "paid",
        totalAmount: 3499.0,
        currency: "INR",
        customerId: customers[1].id,
        organizationId: organization.id,
        orderDate: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        shippingAddress: {
          name: "Jane Smith",
          address1: "456 Park Avenue",
          city: "Delhi",
          province: "Delhi",
          zip: "110001",
          country: "India",
        },
        lineItems: {
          create: [
            {
              shopifyLineItemId: "9234567890125",
              productId: products[2].id,
              sku: "SHOES-WHT-10",
              title: "White Sneakers - Size 10",
              quantity: 1,
              price: 3499.0,
              totalPrice: 3499.0,
              taxAmount: 629.82,
            },
          ],
        },
      },
      include: {
        lineItems: true,
      },
    }),
  ]);

  // 9. Create Cancellation Request
  console.log("❌ Creating cancellation requests...");
  const cancellationRequest = await prisma.cancellationRequest.create({
    data: {
      orderId: orders[1].id,
      customerId: customers[1].id,
      organizationId: organization.id,
      reason: "Changed my mind about the color",
      reasonCategory: "changed_mind",
      initiatedBy: "customer",
      refundPreference: "full",
      status: "pending",
      riskScore: 0.2,
    },
  });

  // 10. Create Integrations
  console.log("🔌 Creating integrations...");
  await Promise.all([
    prisma.integration.create({
      data: {
        organizationId: organization.id,
        type: "shopify",
        name: "Shopify Store",
        config: {
          storeUrl: "demo-store.myshopify.com",
          apiVersion: "2024-01",
        },
        syncStatus: "active",
        lastSyncAt: new Date(),
      },
    }),
    prisma.integration.create({
      data: {
        organizationId: organization.id,
        type: "unicommerce",
        name: "Unicommerce Inventory",
        config: {
          tenantId: "demo-tenant",
        },
        syncStatus: "active",
      },
    }),
  ]);

  console.log("✅ Database seeding completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`  - Organization: ${organization.name}`);
  console.log(`  - Admin User: ${adminUser.email}`);
  console.log(`  - Rule Templates: ${templates.length}`);
  console.log(`  - Customers: ${customers.length}`);
  console.log(`  - Products: ${products.length}`);
  console.log(`  - Orders: ${orders.length}`);
  console.log(`  - Cancellation Requests: 1`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error seeding database:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

