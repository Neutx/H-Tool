/**
 * Shopify API Client for H-Tool
 * Handles orders, refunds, and inventory operations
 */

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || "2024-01";

interface ShopifyError {
  errors?: any;
  message?: string;
}

class ShopifyClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
      console.warn("Shopify credentials not configured");
    }

    this.baseUrl = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}`;
    this.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN || "",
    };
  }

  /**
   * Make a request to Shopify API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      // Check content type before parsing JSON
      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError);
          const text = await response.text();
          return {
            success: false,
            error: `Invalid JSON response from Shopify API. Status: ${response.status}. Response: ${text.substring(0, 200)}`,
          };
        }
      } else {
        // Non-JSON response (e.g., HTML error page)
        const text = await response.text();
        return {
          success: false,
          error: `Non-JSON response from Shopify API. Status: ${response.status}. Response: ${text.substring(0, 200)}`,
        };
      }

      if (!response.ok) {
        const error = data as ShopifyError;
        // Extract error message from various Shopify error formats
        let errorMessage = "Shopify API error";
        
        if (error.message) {
          errorMessage = error.message;
        } else if (error.errors) {
          if (typeof error.errors === "string") {
            errorMessage = error.errors;
          } else if (Array.isArray(error.errors)) {
            errorMessage = error.errors.join(", ");
          } else if (typeof error.errors === "object") {
            // Shopify sometimes returns errors as an object with field names
            const errorParts = Object.entries(error.errors).map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(", ")}`;
              }
              return `${key}: ${value}`;
            });
            errorMessage = errorParts.join("; ");
          }
        }

        // Add HTTP status code for better debugging
        const statusText = response.statusText || `HTTP ${response.status}`;
        return {
          success: false,
          error: `Shopify API error (${statusText}): ${errorMessage}`,
        };
      }

      return { success: true, data: data as T };
    } catch (error) {
      console.error("Shopify API error:", error);
      
      // Handle network errors specifically
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          error: `Network error: Unable to connect to Shopify API. Please check your internet connection and Shopify store URL.`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Get order details from Shopify
   */
  async getOrder(orderId: string) {
    return this.request(`/orders/${orderId}.json`, {
      method: "GET",
    });
  }

  /**
   * Create a refund for an order
   */
  async createRefund(orderId: string, refundData: {
    notify?: boolean;
    note?: string;
    shipping?: {
      full_refund?: boolean;
      amount?: number;
    };
    refund_line_items?: Array<{
      line_item_id: string;
      quantity: number;
      restock_type?: "cancel" | "return" | "no_restock";
    }>;
    transactions?: Array<{
      parent_id: string;
      amount: number;
      kind: "refund";
      gateway: string;
    }>;
  }) {
    return this.request(`/orders/${orderId}/refunds.json`, {
      method: "POST",
      body: JSON.stringify({ refund: refundData }),
    });
  }

  /**
   * Calculate refund amount
   */
  async calculateRefund(orderId: string, refundData: {
    shipping?: {
      full_refund?: boolean;
      amount?: number;
    };
    refund_line_items?: Array<{
      line_item_id: string;
      quantity: number;
    }>;
  }) {
    return this.request(`/orders/${orderId}/refunds/calculate.json`, {
      method: "POST",
      body: JSON.stringify({ refund: refundData }),
    });
  }

  /**
   * Get all refunds for a specific order
   */
  async getOrderRefunds(orderId: string) {
    return this.request(`/orders/${orderId}/refunds.json`, {
      method: "GET",
    });
  }

  /**
   * Update inventory level
   */
  async updateInventoryLevel(
    inventoryItemId: string,
    locationId: string,
    available: number
  ) {
    return this.request(`/inventory_levels/set.json`, {
      method: "POST",
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available,
      }),
    });
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string) {
    return this.request(`/products/${productId}.json`, {
      method: "GET",
    });
  }

  /**
   * Get recent refunds across all orders
   * Fetches last N refunds from Shopify using REST API
   * Note: Shopify doesn't have a direct "all refunds" endpoint,
   * so we fetch recent orders and their refunds
   */
  async getRecentRefunds(limit: number = 50) {
    try {
      // Fetch recent orders (last 100 to ensure we get enough refunds)
      const ordersResponse = await this.request<{
        orders: Array<{
          id: string;
          name: string;
          created_at: string;
          customer: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
          } | null;
          line_items: Array<{
            id: string;
            name: string;
            quantity: number;
            price: string;
          }>;
          total_price: string;
          currency: string;
        }>;
      }>(
        `/orders.json?limit=100&status=any&order=created_at desc`,
        {
          method: "GET",
        }
      );

      if (!ordersResponse.success || !ordersResponse.data) {
        console.error("[Shopify] Failed to fetch orders:", ordersResponse.error || "Unknown error");
        return ordersResponse;
      }

      // Fetch refunds for each order
      const refunds: any[] = [];
      const orders = ordersResponse.data.orders.slice(0, 100); // Limit to 100 orders
      const diagnostics: string[] = [];
      
      diagnostics.push(`[Shopify] Fetched ${orders.length} orders from Shopify`);
      console.log(`[Shopify] Fetched ${orders.length} orders from Shopify`);
      
      if (orders.length === 0) {
        diagnostics.push("[Shopify] No orders found in Shopify store");
        console.log("[Shopify] No orders found in Shopify store");
        return {
          success: true,
          data: {
            refunds: {
              edges: [],
            },
            _diagnostics: diagnostics,
          },
        };
      }

      let ordersWithRefunds = 0;
      let ordersChecked = 0;
      let totalRefundsFound = 0;

      for (const order of orders) {
        ordersChecked++;
        const refundsResponse = await this.request<{
          refunds: Array<{
            id: string;
            created_at: string;
            note: string;
            user_id: string;
            refund_line_items: Array<{
              line_item_id: string;
              quantity: number;
              restock_type: string;
            }>;
            transactions: Array<{
              id: string;
              status: string;
              amount: string;
              gateway: string;
              processed_at: string;
            }>;
          }>;
        }>(`/orders/${order.id}/refunds.json`, {
          method: "GET",
        });

        if (!refundsResponse.success) {
          // Log error but continue checking other orders
          const errorMsg = refundsResponse.error || "Unknown error";
          diagnostics.push(`[Shopify] Failed to fetch refunds for order ${order.id} (${order.name}): ${errorMsg}`);
          console.warn(`[Shopify] Failed to fetch refunds for order ${order.id} (${order.name}):`, errorMsg);
        } else if (refundsResponse.data?.refunds && refundsResponse.data.refunds.length > 0) {
          ordersWithRefunds++;
          totalRefundsFound += refundsResponse.data.refunds.length;
          diagnostics.push(`[Shopify] Found ${refundsResponse.data.refunds.length} refund(s) for order ${order.id} (${order.name})`);
          console.log(`[Shopify] Found ${refundsResponse.data.refunds.length} refund(s) for order ${order.id} (${order.name})`);
          for (const refund of refundsResponse.data.refunds) {
            // Calculate total refunded amount
            const totalRefunded = refund.transactions.reduce(
              (sum, txn) => sum + parseFloat(txn.amount || "0"),
              0
            );

            // Get product names from line items
            const refundLineItemIds = refund.refund_line_items.map(
              (item) => item.line_item_id
            );
            const productNames = order.line_items
              .filter((item) => refundLineItemIds.includes(item.id.toString()))
              .map((item) => item.name)
              .join(", ");

            refunds.push({
              id: refund.id,
              createdAt: refund.created_at,
              note: refund.note,
              totalRefunded: {
                amount: totalRefunded.toString(),
                currencyCode: order.currency,
              },
              order: {
                id: order.id,
                name: order.name,
                customer: order.customer
                  ? {
                      id: order.customer.id,
                      displayName: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
                      email: order.customer.email,
                    }
                  : null,
                lineItems: {
                  edges: order.line_items.map((item) => ({
                    node: {
                      name: item.name,
                      quantity: item.quantity,
                    },
                  })),
                },
              },
              refundLineItems: {
                edges: refund.refund_line_items.map((item) => ({
                  node: {
                    quantity: item.quantity,
                    restockType: item.restock_type,
                    lineItem: {
                      name:
                        order.line_items.find(
                          (li) => li.id.toString() === item.line_item_id
                        )?.name || "Unknown",
                      sku: "",
                    },
                  },
                })),
              },
              transactions: refund.transactions.map((txn) => ({
                id: txn.id,
                status: txn.status,
                amount: txn.amount,
                gateway: txn.gateway,
                processedAt: txn.processed_at,
              })),
            });

            // Stop if we have enough refunds
            if (refunds.length >= limit) break;
          }
        }

        // Stop if we have enough refunds
        if (refunds.length >= limit) break;
      }

      const summaryMsg = `[Shopify] Summary: Checked ${ordersChecked} orders, found refunds in ${ordersWithRefunds} orders, total refunds: ${totalRefundsFound}, returning ${refunds.length}`;
      diagnostics.push(summaryMsg);
      console.log(summaryMsg);

      // Sort by created_at descending and limit
      refunds.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return {
        success: true,
        data: {
          refunds: {
            edges: refunds.slice(0, limit).map((refund) => ({
              node: refund,
            })),
          },
          _diagnostics: diagnostics,
        },
      };
    } catch (error) {
      console.error("Error fetching recent refunds:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get cancelled orders with filtered query (production-grade)
   * Uses cancelled_at_min filter to only fetch cancelled orders
   */
  async getCancelledOrders(lastSyncAt?: Date, limit: number = 50) {
    const params = new URLSearchParams({
      status: "any",
      financial_status: "any",
      fulfillment_status: "any",
      limit: limit.toString(),
      order: "cancelled_at desc",
    });

    if (lastSyncAt) {
      params.append("cancelled_at_min", lastSyncAt.toISOString());
    }

    return this.request<{
      orders: Array<{
        id: string;
        name: string;
        cancelled_at: string;
        cancel_reason: string | null;
        customer: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
        } | null;
        line_items: Array<{
          id: string;
          name: string;
          quantity: number;
          price: string;
        }>;
        total_price: string;
        currency: string;
      }>;
    }>(`/orders.json?${params.toString()}`, {
      method: "GET",
    });
  }

  /**
   * Get returns from Shopify Returns API
   * Note: This uses the Returns API, not scanning orders
   */
  async getReturns(lastSyncAt?: Date, limit: number = 50) {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (lastSyncAt) {
      params.append("created_at_min", lastSyncAt.toISOString());
    }

    return this.request<{
      returns: Array<{
        id: string;
        order_id: string;
        status: string;
        created_at: string;
        received_at: string | null;
        return_line_items: Array<{
          id: string;
          line_item_id: string;
          quantity: number;
          reason: string | null;
        }>;
      }>;
    }>(`/returns.json?${params.toString()}`, {
      method: "GET",
    });
  }

  /**
   * Get refunds using filtered endpoint (if available)
   * Falls back to order scanning if /refunds.json doesn't exist
   */
  async getRefunds(lastSyncAt?: Date, limit: number = 50) {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (lastSyncAt) {
      params.append("created_at_min", lastSyncAt.toISOString());
    }

    // Try the direct refunds endpoint first
    const refundsResponse = await this.request<{
      refunds: Array<{
        id: string;
        order_id: string;
        created_at: string;
        note: string | null;
        transactions: Array<{
          id: string;
          status: string;
          amount: string;
          gateway: string;
          processed_at: string;
        }>;
        refund_line_items: Array<{
          line_item_id: string;
          quantity: number;
          restock_type: string;
        }>;
      }>;
    }>(`/refunds.json?${params.toString()}`, {
      method: "GET",
    });

    // If refunds endpoint doesn't exist, fall back to old method
    if (!refundsResponse.success && refundsResponse.error?.includes("404")) {
      console.warn("[Shopify] /refunds.json endpoint not available, using order scanning fallback");
      return this.getRecentRefunds(limit);
    }

    return refundsResponse;
  }

  /**
   * Register a webhook with Shopify
   */
  async registerWebhook(topic: string, address: string) {
    return this.request<{
      webhook: {
        id: string;
        topic: string;
        address: string;
        format: string;
        created_at: string;
        updated_at: string;
      };
    }>(`/webhooks.json`, {
      method: "POST",
      body: JSON.stringify({
        webhook: {
          topic,
          address,
          format: "json",
        },
      }),
    });
  }

  /**
   * List all webhooks
   */
  async listWebhooks() {
    return this.request<{
      webhooks: Array<{
        id: string;
        topic: string;
        address: string;
        format: string;
        created_at: string;
        updated_at: string;
      }>;
    }>(`/webhooks.json`, {
      method: "GET",
    });
  }

  /**
   * Delete a webhook by ID
   */
  async deleteWebhook(webhookId: string) {
    return this.request(`/webhooks/${webhookId}.json`, {
      method: "DELETE",
    });
  }

  /**
   * Mock refund creation for development
   */
  async mockCreateRefund(orderId: string, amount: number) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock successful refund
    return {
      success: true,
      data: {
        refund: {
          id: Math.random().toString(36).substring(7),
          order_id: orderId,
          created_at: new Date().toISOString(),
          note: "Refund processed via H-Tool",
          transactions: [
            {
              id: Math.random().toString(36).substring(7),
              amount: amount.toString(),
              kind: "refund",
              status: "success",
              gateway: "manual",
            },
          ],
        },
      },
    };
  }
}

export const shopify = new ShopifyClient();

