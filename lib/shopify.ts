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

      const data = await response.json();

      if (!response.ok) {
        const error = data as ShopifyError;
        return {
          success: false,
          error: error.message || error.errors || "Shopify API error",
        };
      }

      return { success: true, data: data as T };
    } catch (error) {
      console.error("Shopify API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
   * Get all refunds for an order
   */
  async getRefunds(orderId: string) {
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
        return ordersResponse;
      }

      // Fetch refunds for each order
      const refunds: any[] = [];
      const orders = ordersResponse.data.orders.slice(0, 100); // Limit to 100 orders

      for (const order of orders) {
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

        if (refundsResponse.success && refundsResponse.data?.refunds) {
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

