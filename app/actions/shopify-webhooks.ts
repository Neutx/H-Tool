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
    "orders/update": `${baseUrl}/api/webhooks/shopify/orders-update`,
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
      "orders/update",
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
              shopifyWebhookId: webhook.id,
              address: webhook.address,
              status: "active",
            },
            create: {
              organizationId,
              topic,
              shopifyWebhookId: webhook.id,
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

    // Check if webhook already exists
    const existing = await prisma.shopifyWebhook.findUnique({
      where: {
        organizationId_topic: {
          organizationId,
          topic,
        },
      },
    });

    if (existing) {
      // Delete old webhook from Shopify
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
      const dbWebhook = await prisma.shopifyWebhook.create({
        data: {
          organizationId,
          topic,
          shopifyWebhookId: webhook.id,
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
    const requiredTopics = [
      "orders/create",
      "orders/update",
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

    // Call Shopify API to send test webhook
    const response = await shopify.sendTestWebhook(webhook.shopifyWebhookId);

    if (!response.success) {
      console.error(`Failed to trigger test webhook: ${response.error}`);
      return {
        success: false,
        error: response.error || "Failed to trigger test webhook",
      };
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
