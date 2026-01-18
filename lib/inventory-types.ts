/**
 * Inventory Management Types
 */

export type RestockStrategy = "auto_restock" | "manual_review" | "no_restock";

export type AdjustmentReason =
  | "cancellation"
  | "return"
  | "damaged"
  | "lost"
  | "manual"
  | "sync";

export type LocationType = "warehouse" | "store" | "supplier";

export interface InventoryLocation {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  active: boolean;
}

export interface StockLevel {
  productId: string;
  locationId: string;
  available: number;
  reserved: number;
  damaged: number;
  total: number;
}

export interface RestockDecision {
  shouldRestock: boolean;
  quantity: number;
  locationId: string;
  reason: string;
  strategy: RestockStrategy;
}

export interface InventoryMetrics {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  restocksToday: number;
  adjustmentsToday: number;
  syncStatus: "synced" | "syncing" | "error";
  lastSyncAt?: Date;
}

export interface ProductWithStock {
  id: string;
  sku: string;
  title: string;
  price: number;
  stockLevel: StockLevel;
  restockRule?: {
    minThreshold: number;
    restockQuantity: number;
    strategy: RestockStrategy;
  };
}

