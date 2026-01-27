import { NextRequest } from "next/server";
import { parseWebhookPayload, respondToWebhook, respondToWebhookError } from "@/lib/shopify-webhook-utils";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime (Prisma requires Node.js)
export const runtime = "nodejs";

/**
 * Extract numeric ID from Shopify GID format
 * Handles both GID format (gid://shopify/Refund/123) and plain numeric strings
 */
function extractShopifyId(gidOrId: string | number): string {
  const str = String(gidOrId);
  // If it's a GID format, extract the numeric part
  if (str.startsWith("gid://")) {
    const parts = str.split("/");
    return parts[parts.length - 1];
  }
  // Otherwise, assume it's already a numeric string
  return str;
}

/**
 * Handle orders/create webhook from Shopify
 * Shopify sends this when a new order is created
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and verify webhook payload
    const { payload, isValid } = await parseWebhookPayload<any>(request);

    if (!isValid || !payload) {
      return respondToWebhookError("Invalid webhook signature", 401);
    }

    // Check if this is a test webhook
    // Shopify test webhooks often don't have all fields or have specific IDs
    // We'll treat it as a real webhook but log it differently if we can identify it
    // For now, we just process it normally

    // Get shop domain from header or payload
    const shopDomain = request.headers.get("X-Shopify-Shop-Domain") || payload.shop_domain;
    if (!shopDomain) {
      console.error("[Webhook] Missing shop domain");
      return respondToWebhookError("Missing shop domain", 400);
    }

    // Find organization by Shopify store URL
    const organization = await prisma.organization.findFirst({
      where: {
        shopifyStoreUrl: shopDomain.replace(".myshopify.com", ""),
      },
    });

    if (!organization) {
      console.error(`[Webhook] Organization not found for shop: ${shopDomain}`);
      return respondToWebhookError("Organization not found", 404);
    }

    // Update webhook test status (if it exists)
    // This allows us to track that the webhook is working
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "orders/create",
      },
      data: {
        testStatus: "success",
        lastTestedAt: new Date(),
      },
    });

    console.log(`[Webhook] Processing orders/create for order ${payload.id}`);

    // Extract numeric IDs
    const shopifyOrderId = extractShopifyId(payload.id);
    const orderIdBigInt = BigInt(shopifyOrderId);

    // Check if order already exists
    const existingOrder = await prisma.order.findFirst({
      where: { shopifyOrderId: orderIdBigInt },
    });

    if (existingOrder) {
      console.log(`[Webhook] Order ${shopifyOrderId} already exists, skipping creation`);
      return respondToWebhook();
    }

    // Handle Customer
    let customerId: string;
    const shopifyCustomerIdRaw = payload.customer?.id;

    if (shopifyCustomerIdRaw) {
      const shopifyCustomerId = extractShopifyId(shopifyCustomerIdRaw);
      
      // Try to find existing customer
      let customer = await prisma.customer.findFirst({
        where: { 
          organizationId: organization.id,
          shopifyCustomerId 
        },
      });

      if (!customer && payload.customer.email) {
        // Fallback: try finding by email
        customer = await prisma.customer.findFirst({
          where: { 
            organizationId: organization.id,
            email: payload.customer.email 
          },
        });
      }

      if (customer) {
        customerId = customer.id;
        // Update customer if needed
        if (customer.shopifyCustomerId !== shopifyCustomerId) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { shopifyCustomerId }
          });
        }
      } else {
        // Create new customer
        customer = await prisma.customer.create({
          data: {
            organizationId: organization.id,
            shopifyCustomerId,
            email: payload.customer.email || null,
            name: `${payload.customer.first_name || ""} ${payload.customer.last_name || ""}`.trim() || "Unknown Customer",
            phone: payload.customer.phone || null,
          },
        });
        customerId = customer.id;
        console.log(`[Webhook] Created new customer ${customerId} for order`);
      }
    } else {
      // Order without customer (e.g. POS?) - verify if we can support this
      // For now, require customer or create a "Guest" customer if needed
      // But database schema requires customerId on Order
      console.warn(`[Webhook] Order ${shopifyOrderId} missing customer data`);
      
      // Try to find a default guest customer or fail
      // For now, we'll return success to Shopify but log error
      // In a real scenario, we might want a "Guest" customer record per organization
      return respondToWebhook(); 
    }

    // Process Line Items & Check Products
    const lineItemsToCreate = [];
    const validLineItems = Array.isArray(payload.line_items) ? payload.line_items : [];
    
    for (const item of validLineItems) {
      if (!item.sku) {
        console.warn(`[Webhook] Line item ${item.id} missing SKU, skipping item`);
        continue;
      }

      // Find product by SKU
      const product = await prisma.product.findFirst({
        where: {
          organizationId: organization.id,
          sku: item.sku,
        },
      });

      if (!product) {
        console.warn(`[Webhook] Product with SKU ${item.sku} not found, skipping line item`);
        // We skip the line item, but if all items are skipped, we might have an empty order
        // Alternatively, we could create a "placeholder" product, but plan says skip
        continue;
      }

      lineItemsToCreate.push({
        shopifyLineItemId: extractShopifyId(item.id),
        productId: product.id,
        sku: item.sku,
        title: item.title || product.name,
        quantity: item.quantity || 1,
        price: parseFloat(item.price || "0"),
        totalPrice: parseFloat(item.price || "0") * (item.quantity || 1),
        taxAmount: parseFloat(item.tax_lines?.reduce((sum: number, tax: any) => sum + parseFloat(tax.price || "0"), 0) || "0"),
        inventoryManaged: product.inventoryManaged,
      });
    }

    if (lineItemsToCreate.length === 0) {
      console.warn(`[Webhook] No valid line items found for order ${shopifyOrderId} (missing products?), skipping order`);
      return respondToWebhook();
    }

    // Create Order
    const order = await prisma.order.create({
      data: {
        organizationId: organization.id,
        shopifyOrderId: orderIdBigInt,
        orderNumber: String(payload.order_number || payload.name),
        status: payload.status || "open", // Shopify status is complex, default to open
        paymentStatus: payload.financial_status || "pending",
        fulfillmentStatus: payload.fulfillment_status || "unfulfilled",
        totalAmount: parseFloat(payload.total_price || "0"),
        currency: payload.currency || "USD",
        customerId: customerId,
        orderDate: payload.created_at ? new Date(payload.created_at) : new Date(),
        shippingAddress: payload.shipping_address || {},
        lineItems: {
          create: lineItemsToCreate,
        },
      },
    });

    console.log(`[Webhook] Successfully created order ${order.id} (Shopify ID: ${shopifyOrderId})`);

    // Log webhook event
    await prisma.webhookEvent.create({
      data: {
        organizationId: organization.id,
        topic: "orders/create",
        payload: payload,
        headers: { shopDomain },
        success: true,
      },
    });

    // Update webhook last triggered timestamp
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "orders/create",
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    return respondToWebhook();
  } catch (error) {
    console.error("[Webhook] Error processing orders/create:", error);
    
    // Try to log error event
    try {
      const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
      if (shopDomain) {
        const org = await prisma.organization.findFirst({
          where: { shopifyStoreUrl: shopDomain.replace(".myshopify.com", "") },
        });
        if (org) {
          await prisma.webhookEvent.create({
            data: {
              organizationId: org.id,
              topic: "orders/create",
              payload: {},
              success: false,
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      }
    } catch (logError) {
      console.error("[Webhook] Failed to log error event:", logError);
    }

    return respondToWebhookError(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}
