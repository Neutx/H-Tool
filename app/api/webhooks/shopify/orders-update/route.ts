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
  if (str.startsWith("gid://")) {
    const parts = str.split("/");
    return parts[parts.length - 1];
  }
  return str;
}

/**
 * Handle orders/update webhook from Shopify
 * Shopify sends this when an order is updated
 */
export async function POST(request: NextRequest) {
  try {
    const { payload, isValid } = await parseWebhookPayload<any>(request);

    if (!isValid || !payload) {
      return respondToWebhookError("Invalid webhook signature", 401);
    }

    const shopDomain = request.headers.get("X-Shopify-Shop-Domain") || payload.shop_domain;
    if (!shopDomain) {
      console.error("[Webhook] Missing shop domain");
      return respondToWebhookError("Missing shop domain", 400);
    }

    const organization = await prisma.organization.findFirst({
      where: {
        shopifyStoreUrl: shopDomain.replace(".myshopify.com", ""),
      },
    });

    if (!organization) {
      console.error(`[Webhook] Organization not found for shop: ${shopDomain}`);
      return respondToWebhookError("Organization not found", 404);
    }

    // Update webhook test status
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "orders/update",
      },
      data: {
        testStatus: "success",
        lastTestedAt: new Date(),
      },
    });

    console.log(`[Webhook] Processing orders/update for order ${payload.id}`);

    const shopifyOrderId = extractShopifyId(payload.id);
    const orderIdBigInt = BigInt(shopifyOrderId);

    // Check if order exists
    const existingOrder = await prisma.order.findFirst({
      where: { shopifyOrderId: orderIdBigInt },
      include: { lineItems: true },
    });

    if (existingOrder) {
      // UPDATE EXISTING ORDER
      console.log(`[Webhook] Updating existing order ${shopifyOrderId}`);
      
      // Update order fields
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          status: payload.status || existingOrder.status,
          paymentStatus: payload.financial_status || existingOrder.paymentStatus,
          fulfillmentStatus: payload.fulfillment_status || existingOrder.fulfillmentStatus,
          totalAmount: parseFloat(payload.total_price || String(existingOrder.totalAmount)),
          currency: payload.currency || existingOrder.currency,
          shippingAddress: payload.shipping_address || existingOrder.shippingAddress,
        },
      });

      // Sync line items if provided
      if (Array.isArray(payload.line_items) && payload.line_items.length > 0) {
        const payloadLineItemIds = new Set(
          payload.line_items.map((item: any) => extractShopifyId(item.id))
        );

        // Process updated/new line items
        for (const item of payload.line_items) {
          const shopifyLineItemId = extractShopifyId(item.id);
          const existingLineItem = existingOrder.lineItems.find(
            (li) => li.shopifyLineItemId === shopifyLineItemId
          );

          if (!item.sku) {
            console.warn(`[Webhook] Line item ${item.id} missing SKU, skipping`);
            continue;
          }

          const product = await prisma.product.findFirst({
            where: {
              organizationId: organization.id,
              sku: item.sku,
            },
          });

          if (!product) {
            console.warn(`[Webhook] Product with SKU ${item.sku} not found, skipping line item`);
            continue;
          }

          const lineItemData = {
            shopifyLineItemId,
            productId: product.id,
            sku: item.sku,
            title: item.title || product.name,
            quantity: item.quantity || 1,
            price: parseFloat(item.price || "0"),
            totalPrice: parseFloat(item.price || "0") * (item.quantity || 1),
            taxAmount: parseFloat(item.tax_lines?.reduce((sum: number, tax: any) => sum + parseFloat(tax.price || "0"), 0) || "0"),
            inventoryManaged: product.inventoryManaged,
          };

          if (existingLineItem) {
            // Update existing line item
            await prisma.lineItem.update({
              where: { id: existingLineItem.id },
              data: lineItemData,
            });
          } else {
            // Create new line item
            await prisma.lineItem.create({
              data: {
                ...lineItemData,
                orderId: existingOrder.id,
              },
            });
          }
        }

        // Delete line items not in payload (removed from order)
        const lineItemsToDelete = existingOrder.lineItems.filter(
          (li) => li.shopifyLineItemId && !payloadLineItemIds.has(li.shopifyLineItemId)
        );

        for (const lineItem of lineItemsToDelete) {
          await prisma.lineItem.delete({
            where: { id: lineItem.id },
          });
        }
      }

      // Update customer if changed
      if (payload.customer?.id) {
        const shopifyCustomerId = extractShopifyId(payload.customer.id);
        let customer = await prisma.customer.findFirst({
          where: {
            organizationId: organization.id,
            shopifyCustomerId,
          },
        });

        if (!customer && payload.customer.email) {
          customer = await prisma.customer.findFirst({
            where: {
              organizationId: organization.id,
              email: payload.customer.email,
            },
          });
        }

        if (customer && customer.id !== existingOrder.customerId) {
          // Update order's customer
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: { customerId: customer.id },
          });
        } else if (!customer) {
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
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: { customerId: customer.id },
          });
        }
      }

      // Log webhook event
      await prisma.webhookEvent.create({
        data: {
          organizationId: organization.id,
          topic: "orders/update",
          payload: payload,
          headers: { shopDomain },
          success: true,
        },
      });

      console.log(`[Webhook] Successfully updated order ${existingOrder.id}`);
    } else {
      // CREATE NEW ORDER (same as orders/create logic)
      console.log(`[Webhook] Order ${shopifyOrderId} not found, creating new order`);

      let customerId: string;
      const shopifyCustomerIdRaw = payload.customer?.id;

      if (shopifyCustomerIdRaw) {
        const shopifyCustomerId = extractShopifyId(shopifyCustomerIdRaw);
        
        let customer = await prisma.customer.findFirst({
          where: { 
            organizationId: organization.id,
            shopifyCustomerId 
          },
        });

        if (!customer && payload.customer.email) {
          customer = await prisma.customer.findFirst({
            where: { 
              organizationId: organization.id,
              email: payload.customer.email 
            },
          });
        }

        if (customer) {
          customerId = customer.id;
          if (customer.shopifyCustomerId !== shopifyCustomerId) {
            await prisma.customer.update({
              where: { id: customer.id },
              data: { shopifyCustomerId }
            });
          }
        } else {
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
          console.log(`[Webhook] Created new customer ${customerId}`);
        }
      } else {
        console.warn(`[Webhook] Order ${shopifyOrderId} missing customer data`);
        // Log event and return
        await prisma.webhookEvent.create({
          data: {
            organizationId: organization.id,
            topic: "orders/update",
            payload: payload,
            headers: { shopDomain },
            success: false,
            errorMessage: "Missing customer data",
          },
        });
        return respondToWebhook();
      }

      const lineItemsToCreate = [];
      const validLineItems = Array.isArray(payload.line_items) ? payload.line_items : [];
      
      for (const item of validLineItems) {
        if (!item.sku) {
          console.warn(`[Webhook] Line item ${item.id} missing SKU, skipping`);
          continue;
        }

        const product = await prisma.product.findFirst({
          where: {
            organizationId: organization.id,
            sku: item.sku,
          },
        });

        if (!product) {
          console.warn(`[Webhook] Product with SKU ${item.sku} not found, skipping`);
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
        console.warn(`[Webhook] No valid line items for order ${shopifyOrderId}`);
        await prisma.webhookEvent.create({
          data: {
            organizationId: organization.id,
            topic: "orders/update",
            payload: payload,
            headers: { shopDomain },
            success: false,
            errorMessage: "No valid line items (missing products)",
          },
        });
        return respondToWebhook();
      }

      await prisma.order.create({
        data: {
          organizationId: organization.id,
          shopifyOrderId: orderIdBigInt,
          orderNumber: String(payload.order_number || payload.name),
          status: payload.status || "open",
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

      // Log webhook event
      await prisma.webhookEvent.create({
        data: {
          organizationId: organization.id,
          topic: "orders/update",
          payload: payload,
          headers: { shopDomain },
          success: true,
        },
      });

      console.log(`[Webhook] Created order ${shopifyOrderId} from update webhook`);
    }

    // Update webhook last triggered timestamp
    await prisma.shopifyWebhook.updateMany({
      where: {
        organizationId: organization.id,
        topic: "orders/update",
      },
      data: {
        lastTriggeredAt: new Date(),
      },
    });

    return respondToWebhook();
  } catch (error) {
    console.error("[Webhook] Error processing orders/update:", error);
    
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
              topic: "orders/update",
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
