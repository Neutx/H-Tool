"use server";

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
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerShopifyWebhooks:entry',message:'Bulk webhook registration start',data:{organizationId,hasBaseUrl:!!process.env.NEXT_PUBLIC_APP_URL,baseUrlPreview:String(process.env.NEXT_PUBLIC_APP_URL||'').slice(0,120)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

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

        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerShopifyWebhooks:topic',message:'Attempt register topic',data:{topic,webhookUrlPreview:webhookUrl.slice(0,180),shopDomainPreview:String(organization?.shopifyStoreUrl||'').slice(0,120)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log

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

        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerShopifyWebhooks:shopifyResp',message:'Shopify registerWebhook returned',data:{topic,success:!!(response as any)?.success,hasWebhook:!!(response as any)?.data?.webhook,errorPreview:String((response as any)?.error||'').slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log

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
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerShopifyWebhooks:failed',message:'Shopify registerWebhook failed (no webhook in response)',data:{topic,errorPreview:String((response as any)?.error||'').slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
        }
      } catch (error) {
        console.error(`Error registering webhook ${topic}:`, error);
        // Continue with other webhooks even if one fails
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H4',location:'app/actions/shopify-webhooks.ts:registerShopifyWebhooks:catch',message:'Error registering webhook topic (catch)',data:{topic,errorMsg:String((error as any)?.message||error).slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerShopifyWebhooks:exit',message:'Bulk webhook registration finished',data:{organizationId,registeredCount:registeredWebhooks.length,topicsAttempted:topics.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    return {
      success: true,
      data: registeredWebhooks,
    };
  } catch (error) {
    console.error("Error registering webhooks:", error);
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H4',location:'app/actions/shopify-webhooks.ts:registerShopifyWebhooks:outerCatch',message:'Bulk webhook registration outer catch',data:{organizationId,errorMsg:String((error as any)?.message||error).slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
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

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerSingleWebhook:entry',message:'Single webhook registration start',data:{organizationId,topic,webhookUrlPreview:webhookUrl.slice(0,180),hasBaseUrl:!!process.env.NEXT_PUBLIC_APP_URL},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

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
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerSingleWebhook:listWebhooks',message:'Shopify listWebhooks returned',data:{topic,success:!!(shopifyListResponse as any)?.success,count:((shopifyListResponse as any)?.data?.webhooks||[]).length,errorPreview:String((shopifyListResponse as any)?.error||'').slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
    if (shopifyListResponse.success && shopifyListResponse.data?.webhooks) {
      const existingShopifyWebhook = shopifyListResponse.data.webhooks.find(
        (wh: any) => wh.topic === topic && wh.address === webhookUrl
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
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'app/actions/shopify-webhooks.ts:registerSingleWebhook:registerResp',message:'Shopify registerWebhook returned',data:{topic,success:!!(response as any)?.success,hasWebhook:!!(response as any)?.data?.webhook,errorPreview:String((response as any)?.error||'').slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

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
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H4',location:'app/actions/shopify-webhooks.ts:registerSingleWebhook:catch',message:'Single webhook registration threw',data:{topic,errorMsg:String((error as any)?.message||error).slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log
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

    // Check which webhooks have received data
    const webhookEvents = await prisma.webhookEvent.groupBy({
      by: ['topic'],
      where: {
        organizationId,
        topic: { in: requiredTopics },
      },
      _count: {
        id: true,
      },
    });

    const topicsWithData = new Set(webhookEvents.map(e => e.topic));

    // Also fetch from Shopify to sync status
    const shopifyResponse = await shopify.listWebhooks();
    const shopifyWebhooks = shopifyResponse.success && shopifyResponse.data?.webhooks
      ? shopifyResponse.data.webhooks
      : [];

    // Build webhook info for all required topics
    const webhooks: WebhookInfo[] = requiredTopics.map((topic) => {
      const dbWebhook = dbWebhooks.find((w) => w.topic === topic);
      const hasReceivedData = topicsWithData.has(topic);
      
      if (dbWebhook) {
        const shopifyWebhook = shopifyWebhooks.find(
          (sw) => sw.id === dbWebhook.shopifyWebhookId
        );

        return {
          id: dbWebhook.id,
          topic: dbWebhook.topic,
          address: dbWebhook.address,
          status: shopifyWebhook ? "active" : dbWebhook.status,
          shopifyWebhookId: dbWebhook.shopifyWebhookId,
          lastTriggeredAt: dbWebhook.lastTriggeredAt,
          lastTestedAt: dbWebhook.lastTestedAt,
          testStatus: dbWebhook.testStatus,
          hasReceivedData,
          isRegistered: true,
        };
      } else {
        // Webhook not registered yet
        return {
          id: `unregistered-${topic}`,
          topic,
          address: getWebhookUrl(topic),
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
    const webhook = await prisma.shopifyWebhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.organizationId !== organizationId) {
      return {
        success: false,
        error: "Webhook not found or access denied",
      };
    }

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H5',location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:entry',message:'Trigger webhook test (server action)',data:{webhookId,topic:webhook.topic,hasAddress:!!webhook.address},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    // Attempt Shopify's native test endpoint first (may return 406 on some stores/versions)
    const shopifyTest = await shopify.sendTestWebhook(webhook.shopifyWebhookId);

    if (!shopifyTest.success) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H5',location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:shopifyFailed',message:'Shopify test endpoint failed, falling back to self-test delivery',data:{topic:webhook.topic,errorPreview:String(shopifyTest.error||'').slice(0,180)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

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

      const testPayload = {
        id: `gid://shopify/Order/${Date.now()}`, // unique-ish
        shop_domain: shopDomain,
        created_at: new Date().toISOString(),
        note: "H-Tool self-test webhook delivery",
      };

      const body = JSON.stringify(testPayload);
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(body, "utf8")
        .digest("base64");

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H5',location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:selfDeliver',message:'Sending self-test webhook delivery',data:{topic:webhook.topic,addressPreview:String(webhook.address||'').slice(0,180),shopDomainPreview:String(shopDomain||'').slice(0,80)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

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

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'post-fix',hypothesisId:'H5',location:'app/actions/shopify-webhooks.ts:triggerShopifyWebhookTest:selfDeliverResult',message:'Self-test webhook delivery result',data:{topic:webhook.topic,status:res.status,ok:res.ok,matchedPath:res.headers.get('x-matched-path'),nextErrorStatus:res.headers.get('x-next-error-status'),vercelId:res.headers.get('x-vercel-id')},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      if (!res.ok) {
        return {
          success: false,
          error: `Self-test delivery failed with HTTP ${res.status}`,
        };
      }
    }

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
    const staleWebhooks = shopifyResponse.data.webhooks.filter(
      (wh: any) => !dbWebhookIds.has(String(wh.id))
    );

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
