/**
 * Unicommerce API Client
 * Handles inventory synchronization with Unicommerce
 */

const UNICOMMERCE_API_URL = process.env.UNICOMMERCE_API_URL;
const UNICOMMERCE_ACCESS_TOKEN = process.env.UNICOMMERCE_ACCESS_TOKEN;

interface UnicommerceError {
  error?: string;
  message?: string;
}

class UnicommerceClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor() {
    if (!UNICOMMERCE_API_URL || !UNICOMMERCE_ACCESS_TOKEN) {
      console.warn("Unicommerce credentials not configured");
    }

    this.baseUrl = UNICOMMERCE_API_URL || "https://api.unicommerce.com/v1";
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${UNICOMMERCE_ACCESS_TOKEN || ""}`,
    };
  }

  /**
   * Make a request to Unicommerce API
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
        const error = data as UnicommerceError;
        return {
          success: false,
          error: error.message || error.error || "Unicommerce API error",
        };
      }

      return { success: true, data: data as T };
    } catch (error) {
      console.error("Unicommerce API error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get inventory levels for a product
   */
  async getInventory(sku: string) {
    return this.request(`/inventory/${sku}`, {
      method: "GET",
    });
  }

  /**
   * Update inventory level
   */
  async updateInventory(sku: string, quantity: number, locationCode: string) {
    return this.request(`/inventory/${sku}`, {
      method: "PUT",
      body: JSON.stringify({
        sku,
        quantity,
        locationCode,
      }),
    });
  }

  /**
   * Sync inventory from Unicommerce
   */
  async syncInventory(skus?: string[]) {
    return this.request(`/inventory/sync`, {
      method: "POST",
      body: JSON.stringify({
        skus: skus || [],
      }),
    });
  }

  /**
   * Get all locations
   */
  async getLocations() {
    return this.request(`/locations`, {
      method: "GET",
    });
  }

  /**
   * Mock inventory update for development
   */
  async mockUpdateInventory(
    sku: string,
    quantity: number,
    locationCode: string
  ) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      data: {
        sku,
        quantity,
        locationCode,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Mock inventory sync for development
   */
  async mockSyncInventory(skus?: string[]) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockInventory = (skus || ["SKU001", "SKU002", "SKU003"]).map(
      (sku) => ({
        sku,
        quantity: Math.floor(Math.random() * 100) + 10,
        locationCode: "WH001",
        lastUpdated: new Date().toISOString(),
      })
    );

    return {
      success: true,
      data: {
        synced: mockInventory.length,
        items: mockInventory,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export const unicommerce = new UnicommerceClient();

