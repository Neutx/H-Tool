"use server";

import type { Prisma } from "@prisma/client";
import { shopify } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface WebhookInfo {
  id: string;
  topic: string;
  address: string;
  status: string;
  shopifyWebhookId: string;
  lastTriggeredAt: Date | null;
  lastTestedAt?: Date | null;
  testStatus?: string;
  hasReceivedData?: boolean;
  isRegistered?: boolean;
}

/**
 * Get base URL for webhook endpoints
 */
function getWebhookBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return baseUrl.replace(/\/$/, ""); // Remove trailing slash
}

/**
 * Get webhook URL for a specific topic
 */
function getWebhookUrl(topic: string): string {
  const baseUrl = getWebhookBaseUrl();
  const topicMap: Record<string, string> = {
    "orders/create": `${baseUrl}/api/webhooks/shopify/orders-create`,
    "orders/updated": `${baseUrl}/api/webhooks/shopify/orders-updated`,
    "orders/cancelled": `${baseUrl}/api/webhooks/shopify/orders-cancelled`,
    "refunds/create": `${baseUrl}/api/webhooks/shopify/refunds-create`,
  };
  return topicMap[topic] || `${baseUrl}/api/webhooks/shopify/${topic.replace("/", "-")}`;
}

/**
 * Register all required webhooks for an organization
 */
export async function registerShopifyWebhooks(
  organizationId: string
): Promise<ActionResult<WebhookInfo[]>> {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization || !organization.shopifyStoreUrl) {
      return {
        success: false,
        error: "Organization not found or Shopify store URL not configured",
      };
    }

    const topics = [
      "orders/create",
      "orders/updated",
      "orders/cancelled",
      "refunds/create",
    ];

    const registeredWebhooks: WebhookInfo[] = [];

    for (const topic of topics) {
      try {
        const webhookUrl = getWebhookUrl(topic);

        // Check if webhook already exists in our DB
        const existing = await prisma.shopifyWebhook.findUnique({
          where: {
            organizationId_topic: {
              organizationId,
              topic,
            },
          },
        });

        if (existing) {
          // Delete existing webhook from Shopify first
          await shopify.deleteWebhook(existing.shopifyWebhookId);
          await prisma.shopifyWebhook.delete({
            where: { id: existing.id },
          });
        }

        // Register new webhook with Shopify
        const response = await shopify.registerWebhook(topic, webhookUrl);

        if (response.success && response.data?.webhook) {
          const webhook = response.data.webhook;

          // Store in database
          const dbWebhook = await prisma.shopifyWebhook.upsert({
            where: {
              organizationId_topic: {
                organizationId,
                topic,
              },
            },
            update: {
              shopifyWebhookId: String(webhook.id),
              address: webhook.address,
              status: "active",
            },
            create: {
              organizationId,
              topic,
              shopifyWebhookId: String(webhook.id),
              address: webhook.address,
              status: "active",
            },
          });

          registeredWebhooks.push({
            id: dbWebhook.id,
            topic: dbWebhook.topic,
            address: dbWebhook.address,
            status: dbWebhook.status,
            shopifyWebhookId: dbWebhook.shopifyWebhookId,
            lastTriggeredAt: dbWebhook.lastTriggeredAt,
          });
        } else {
          console.error(`Failed to register webhook ${topic}:`, response.error);
        }
      } catch (error) {
        console.error(`Error registering webhook ${topic}:`, error);
        // Continue with other webhooks even if one fails
      }
    }

    return {
      success: true,
      data: registeredWebhooks,
    };
  } catch (error) {
    console.error("Error registering webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register webhooks",
    };
  }
}

/**
 * Register a single webhook for an organization
 */
export async function registerSingleWebhook(
  organizationId: string,
  topic: string
): Promise<ActionResult<WebhookInfo>> {
  try {
    const webhookUrl = getWebhookUrl(topic);

    // Check if webhook already exists in database
    const existing = await prisma.shopifyWebhook.findUnique({
      where: {
        organizationId_topic: {
          organizationId,
          topic,
        },
      },
    });

    if (existing) {
      // Delete old webhook from Shopify (if it exists)
      try {
        await shopify.deleteWebhook(existing.shopifyWebhookId);
      } catch (err) {
        console.log(`[Webhook] Failed to delete old webhook from Shopify (might not exist): ${err}`);
      }
      
      // Delete from database
      await prisma.shopifyWebhook.delete({
        where: { id: existing.id },
      });
    }

    // Check if webhook with this URL already exists in Shopify
    const shopifyListResponse = await shopify.listWebhooks();
    if (shopifyListResponse.success && shopifyListResponse.data?.webhooks) {
      const existingShopifyWebhook = shopifyListResponse.data.webhooks.find(
        (wh: { topic: string; address: string }) =>
          wh.topic === topic && wh.address === webhookUrl
      );
      
      if (existingShopifyWebhook) {
        // Webhook already registered in Shopify, just save to database
        console.log(`[Webhook] Found existing webhook in Shopify for ${topic}, saving to database`);
        
        const dbWebhook = await prisma.shopifyWebhook.create({
          data: {
            organizationId,
            topic,
            shopifyWebhookId: String(existingShopifyWebhook.id),
            address: existingShopifyWebhook.address,
            status: "active",
          },
        });

        return {
          success: true,
          data: {
            id: dbWebhook.id,
            topic: dbWebhook.topic,
            address: dbWebhook.address,
            status: dbWebhook.status,
            shopifyWebhookId: dbWebhook.shopifyWebhookId,
            lastTriggeredAt: dbWebhook.lastTriggeredAt,
            lastTestedAt: dbWebhook.lastTestedAt,
            testStatus: dbWebhook.testStatus,
            hasReceivedData: false,
            isRegistered: true,
          },
        };
      }
    }

    // Register new webhook with Shopify
    const response = await shopify.registerWebhook(topic, webhookUrl);

    if (response.success && response.data?.webhook) {
      const webhook = response.data.webhook;

      // Store in database
      const dbWebhook = await prisma.shopifyWebhook.create({
        data: {
          organizationId,
          topic,
          shopifyWebhookId: String(webhook.id),
          address: webhook.address,
          status: "active",
        },
      });

      return {
        success: true,
        data: {
          id: dbWebhook.id,
          topic: dbWebhook.topic,
          address: dbWebhook.address,
          status: dbWebhook.status,
          shopifyWebhookId: dbWebhook.shopifyWebhookId,
          lastTriggeredAt: dbWebhook.lastTriggeredAt,
          lastTestedAt: dbWebhook.lastTestedAt,
          testStatus: dbWebhook.testStatus,
          hasReceivedData: false,
          isRegistered: true,
        },
      };
    } else {
      return {
        success: false,
        error: `Failed to register webhook: ${response.error || "Unknown error"}`,
      };
    }
  } catch (error) {
    console.error(`Error registering webhook ${topic}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register webhook",
    };
  }
}

/**
 * List all webhooks for an organization
 */
export async function listShopifyWebhooks(
  organizationId: string
): Promise<ActionResult<WebhookInfo[]>> {
  try {
    type ShopifyWebhookListItem = { id: string | number; topic: string; address: string };

    const requiredTopics = [
      "orders/create",
      "orders/updated",
      "orders/cancelled",
      "refunds/create",
    ];

    // Get webhooks from database
    const dbWebhooks = await prisma.shopifyWebhook.findMany({
      where: { organizationId },
      orderBy: { topic: "asc" },
    });

    // Check which webhooks have received REAL data (exclude UI self-tests).
    // We do this in JS (not JSON-path SQL) to avoid SQL three-valued-logic issues where missing JSON keys can exclude rows.
    const recentEvents = await prisma.webhookEvent.findMany({
      where: {
        organizationId,
        topic: { in: requiredTopics },
      },
      select: {
        topic: true,
        headers: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const topicsWithData = new Set(
      recentEvents
        .filter((e) => {
          const h = e.headers as unknown;
          const obj = h && typeof h === "object" ? (h as Record<string, unknown>) : {};
          return obj.selfTest !== true && obj.isSelfTest !== true;
        })
        .map((e) => e.topic)
    );

    // Also fetch from Shopify to sync status
    const shopifyResponse = await shopify.listWebhooks();
    const shopifyListOk = !!(shopifyResponse.success && shopifyResponse.data?.webhooks);
    const shopifyWebhooks: ShopifyWebhookListItem[] = shopifyListOk
      ? (shopifyResponse.data?.webhooks as ShopifyWebhookListItem[])
      : [];

    // Build webhook info for all required topics
    const webhooks: WebhookInfo[] = requiredTopics.map((topic) => {
      const dbWebhook = dbWebhooks.find((w) => w.topic === topic);
      const hasReceivedData = topicsWithData.has(topic);
      const expectedAddress = getWebhookUrl(topic);

      // Determine if Shopify actually has this webhook right now.
      // If Shopify list fails, we fall back to DB state (avoid flipping UI to "not registered" on transient Shopify API issues).
      const shopifyMatchById = dbWebhook
        ? shopifyWebhooks.find((sw) => String(sw.id) === String(dbWebhook.shopifyWebhookId))
        : undefined;
      const shopifyMatchByTopicAddress = shopifyWebhooks.find(
        (sw) => sw.topic === topic && sw.address === expectedAddress
      );
      const isActuallyRegistered = shopifyListOk
        ? !!(shopifyMatchById || shopifyMatchByTopicAddress)
        : !!dbWebhook;
      
      if (dbWebhook && isActuallyRegistered) {
        return {
          id: dbWebhook.id,
          topic: dbWebhook.topic,
          address: dbWebhook.address,
          status: "active",
          shopifyWebhookId: dbWebhook.shopifyWebhookId,
          lastTriggeredAt: dbWebhook.lastTriggeredAt,
          lastTestedAt: dbWebhook.lastTestedAt,
          testStatus: dbWebhook.testStatus,
          hasReceivedData,
          isRegistered: true,
        };
      } else {
        // Webhook not registered yet (or DB is stale vs Shopify)
        return {
          id: `unregistered-${topic}`,
          topic,
          address: expectedAddress,
          status: "not_registered",
          shopifyWebhookId: "",
          lastTriggeredAt: null,
          lastTestedAt: null,
          testStatus: "not_tested",
          hasReceivedData: false,
          isRegistered: false,
        };
      }
    });

    // Update status in DB if changed
    for (const webhook of webhooks) {
      if (webhook.isRegistered) {
        const dbWebhook = dbWebhooks.find((w) => w.id === webhook.id);
        if (dbWebhook && dbWebhook.status !== webhook.status) {
          await prisma.shopifyWebhook.update({
            where: { id: webhook.id },
            data: { status: webhook.status },
          });
        }
      }
    }

    return {
      success: true,
      data: webhooks,
    };
  } catch (error) {
    console.error("Error listing webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list webhooks",
    };
  }
}

/**
 * Delete a webhook
 */
export async function deleteShopifyWebhook(
  webhookId: string,
  organizationId: string
): Promise<ActionResult<void>> {
  try {
    const webhook = await prisma.shopifyWebhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.organizationId !== organizationId) {
      return {
        success: false,
        error: "Webhook not found or access denied",
      };
    }

    // Delete from Shopify
    const response = await shopify.deleteWebhook(webhook.shopifyWebhookId);

    if (!response.success && !response.error?.includes("404")) {
      // If it's not a 404, log the error but continue
      console.warn(`Failed to delete webhook from Shopify: ${response.error}`);
    }

    // Delete from database
    await prisma.shopifyWebhook.delete({
      where: { id: webhookId },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete webhook",
    };
  }
}

/**
 * Delete all webhooks for an organization
 */
export async function deleteAllShopifyWebhooks(
  organizationId: string
): Promise<ActionResult<void>> {
  try {
    const webhooks = await prisma.shopifyWebhook.findMany({
      where: { organizationId },
    });

    for (const webhook of webhooks) {
      // Delete from Shopify
      await shopify.deleteWebhook(webhook.shopifyWebhookId);
      
      // Delete from database
      await prisma.shopifyWebhook.delete({
        where: { id: webhook.id },
      });
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting all webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete webhooks",
    };
  }
}

/**
 * Sync webhook status with Shopify
 */
export async function syncWebhookStatus(
  organizationId: string
): Promise<ActionResult<WebhookInfo[]>> {
  try {
    // Fetch from Shopify
    const shopifyResponse = await shopify.listWebhooks();
    
    if (!shopifyResponse.success || !shopifyResponse.data?.webhooks) {
      return {
        success: false,
        error: "Failed to fetch webhooks from Shopify",
      };
    }

    const shopifyWebhooks = shopifyResponse.data.webhooks;
    const dbWebhooks = await prisma.shopifyWebhook.findMany({
      where: { organizationId },
    });

    // Update status in database
    for (const dbWebhook of dbWebhooks) {
      const shopifyWebhook = shopifyWebhooks.find(
        (sw) => sw.id === dbWebhook.shopifyWebhookId
      );

      if (shopifyWebhook) {
        // Webhook exists in Shopify, mark as active
        await prisma.shopifyWebhook.update({
          where: { id: dbWebhook.id },
          data: { status: "active" },
        });
      } else {
        // Webhook not found in Shopify, mark as inactive
        await prisma.shopifyWebhook.update({
          where: { id: dbWebhook.id },
          data: { status: "inactive" },
        });
      }
    }

    // Return updated list
    return listShopifyWebhooks(organizationId);
  } catch (error) {
    console.error("Error syncing webhook status:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync webhook status",
    };
  }
}

/**
 * Trigger a test webhook from Shopify
 */
export async function triggerShopifyWebhookTest(
  webhookId: string,
  organizationId: string
): Promise<ActionResult<void>> {
  try {
    // #region agent log (H1/H2) trigger start
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:start',message:'Trigger webhook test invoked',data:{webhookId,organizationId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'} )}).catch(()=>{});
    // #endregion

    const webhook = await prisma.shopifyWebhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.organizationId !== organizationId) {
      // #region agent log (H4) invalid webhook/org
      fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:notFoundOrDenied',message:'Webhook not found or access denied',data:{found:!!webhook,webhookOrgId:webhook?.organizationId ?? null},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'} )}).catch(()=>{});
      // #endregion
      return {
        success: false,
        error: "Webhook not found or access denied",
      };
    }

    // Attempt Shopify's native test endpoint first (may return 406 on some stores/versions)
    const shopifyTest = await shopify.sendTestWebhook(webhook.shopifyWebhookId);

    // #region agent log (H1/H2) shopify test result
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:shopifyTestResult',message:'Shopify /test.json attempt completed',data:{topic:webhook.topic,shopifyWebhookId:String(webhook.shopifyWebhookId),shopifyTestSuccess:!!shopifyTest.success,shopifyTestError:shopifyTest.success?null:(shopifyTest.error||null)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'} )}).catch(()=>{});
    // #endregion

    if (!shopifyTest.success) {
      // #region agent log (H2) falling back to self-test
      fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:selfTestFallback',message:'Shopify test failed; using self-test delivery',data:{topic:webhook.topic,address:webhook.address},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'} )}).catch(()=>{});
      // #endregion
      // Self-test: deliver a signed webhook request directly to our endpoint
      // This validates HMAC verification + handler DB writes without relying on Shopify's /test endpoint.
      const crypto = await import("crypto");
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET || "";
      if (!secret) {
        return {
          success: false,
          error: "SHOPIFY_WEBHOOK_SECRET is not configured; cannot self-test webhook delivery",
        };
      }

      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      const shopDomain = (org?.shopifyStoreUrl || "").includes(".myshopify.com")
        ? (org?.shopifyStoreUrl || "")
        : `${org?.shopifyStoreUrl || ""}.myshopify.com`;

      const nowIso = new Date().toISOString();

      // Prefer a real existing order ID (avoids FK issues in handlers that require orders)
      const existingOrderForOrg = await prisma.order.findFirst({
        where: {
          organizationId,
          shopifyOrderId: { not: null },
        },
        orderBy: { createdAt: "desc" },
      });

      const fallbackOrderIdNumeric = String(Date.now());
      const orderIdNumeric = existingOrderForOrg?.shopifyOrderId
        ? String(existingOrderForOrg.shopifyOrderId)
        : fallbackOrderIdNumeric;

      // Ensure an Order row exists for topics that rely on FK relations (e.g., cancellations).
      // This avoids false-negative "Test" failures due to missing parent records.
      if (webhook.topic === "orders/cancelled") {
        const orderIdBigInt = BigInt(orderIdNumeric);
        const existingOrderRow = await prisma.order.findFirst({
          where: {
            organizationId,
            shopifyOrderId: orderIdBigInt,
          },
        });

        if (!existingOrderRow) {
          const customer = await prisma.customer.create({
            data: {
              organizationId,
              shopifyCustomerId: `self-test-${Date.now()}`,
              email: "self-test@example.com",
              name: "Self Test",
              phone: null,
            },
          });

          await prisma.order.create({
            data: {
              organizationId,
              shopifyOrderId: orderIdBigInt,
              orderNumber: `SELF-TEST-${orderIdNumeric}`,
              status: "open",
              paymentStatus: "paid",
              fulfillmentStatus: "unfulfilled",
              totalAmount: 0,
              currency: "USD",
              customerId: customer.id,
              orderDate: new Date(),
              shippingAddress: {},
            },
          });
        }
      }

      const testPayload: Record<string, unknown> = (() => {
        switch (webhook.topic) {
          case "orders/cancelled":
            return {
              id: orderIdNumeric,
              name: `#TEST-CANCEL-${orderIdNumeric}`,
              cancelled_at: nowIso,
              cancel_reason: "customer",
              shop_domain: shopDomain,
            };
          case "refunds/create":
            return {
              id: `gid://shopify/Refund/${Date.now()}`,
              order_id: orderIdNumeric,
              created_at: nowIso,
              note: "H-Tool self-test webhook delivery",
              transactions: [
                {
                  id: `gid://shopify/Transaction/${Date.now()}`,
                  status: "success",
                  amount: "0.00",
                  gateway: "manual",
                  processed_at: nowIso,
                },
              ],
              refund_line_items: [],
              shop_domain: shopDomain,
            };
          case "orders/create":
          case "orders/updated":
          default:
            return {
              id: orderIdNumeric,
              shop_domain: shopDomain,
              created_at: nowIso,
              note: "H-Tool self-test webhook delivery",
              customer: {
                id: `gid://shopify/Customer/${Date.now()}`,
                email: "self-test@example.com",
                first_name: "Self",
                last_name: "Test",
                phone: null,
              },
              line_items: [],
              total_price: "0.00",
              currency: "USD",
              financial_status: "paid",
              fulfillment_status: null,
              status: "open",
            };
        }
      })();

      const body = JSON.stringify(testPayload);
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");

      const res = await fetch(webhook.address, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-Sha256": hmac,
          "X-Shopify-Shop-Domain": shopDomain,
          // Provide a topic hint for easier server-side debugging (Shopify doesn't send this header by default)
          "X-H-Tool-Test-Topic": webhook.topic,
        },
        body,
      });

      // #region agent log (H2/H4) self-test HTTP result
      fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:selfTestHttpResult',message:'Self-test delivery response received',data:{topic:webhook.topic,status:res.status,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'} )}).catch(()=>{});
      // #endregion

      try {
        // Drain body (best effort) to avoid leaving the stream unread.
        await res.text();
      } catch {
        // ignore
      }

      if (!res.ok) {
        return {
          success: false,
          error: `Self-test delivery failed with HTTP ${res.status}`,
        };
      }

      // Mark as "received data" for UI by recording a WebhookEvent row on successful self-delivery.
      // This matches the UI's hasReceivedData logic (topic exists in WebhookEvent table).
      try {
        await prisma.webhookEvent.create({
          data: {
            organizationId,
            topic: webhook.topic,
            payload: testPayload as unknown as Prisma.InputJsonValue,
            headers: {
              shopDomain,
              selfTest: true,
              address: webhook.address,
            } as unknown as Prisma.InputJsonValue,
            success: true,
          },
        });
      } catch {
        // ignore: self-test marker is best-effort
      }
    }

    // #region agent log (H1/H3) returning success to UI
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:returning',message:'Returning success=true to UI after test trigger',data:{topic:webhook.topic,usedSelfTest:!shopifyTest.success},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'} )}).catch(()=>{});
    // #endregion

    // Update status to testing
    // Note: testStatus field needs to be added to schema first
    // For now we'll just log it
    console.log(`[Webhook] Test triggered for ${webhookId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error triggering test webhook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to trigger test webhook",
    };
  }
}

/**
 * Clean up stale webhooks - removes webhooks from Shopify that are not in our database
 */
export async function cleanupStaleWebhooks(
  organizationId: string
): Promise<ActionResult<{ cleaned: number }>> {
  try {
    // Get all webhooks from Shopify
    const shopifyResponse = await shopify.listWebhooks();
    if (!shopifyResponse.success || !shopifyResponse.data?.webhooks) {
      return {
        success: false,
        error: "Failed to fetch webhooks from Shopify",
      };
    }

    // Get all webhooks from database for this organization
    const dbWebhooks = await prisma.shopifyWebhook.findMany({
      where: { organizationId },
    });

    const dbWebhookIds = new Set(dbWebhooks.map((wh) => wh.shopifyWebhookId));

    // Find webhooks in Shopify that are not in database
    const staleWebhooks = shopifyResponse.data.webhooks.filter((wh) => {
      const id =
        typeof wh === "object" && wh !== null && "id" in wh ? (wh as { id: unknown }).id : undefined;
      return !dbWebhookIds.has(String(id ?? ""));
    });

    // Delete stale webhooks
    let cleaned = 0;
    for (const webhook of staleWebhooks) {
      try {
        await shopify.deleteWebhook(String(webhook.id));
        cleaned++;
        console.log(`[Webhook] Cleaned up stale webhook ${webhook.id} (${webhook.topic})`);
      } catch (err) {
        console.error(`[Webhook] Failed to delete stale webhook ${webhook.id}:`, err);
      }
    }

    return {
      success: true,
      data: { cleaned },
    };
  } catch (error) {
    console.error("Error cleaning up stale webhooks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clean up webhooks",
    };
  }
}
