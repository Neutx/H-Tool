"use client";

import { useState, useEffect } from "react";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";
import { ManualRestockModal } from "@/components/inventory/manual-restock-modal";
import { InventoryAdjustmentModal } from "@/components/inventory/inventory-adjustment-modal";
import { RestockRulesPanel } from "@/components/inventory/restock-rules-panel";
import {
  getInventoryMetrics,
  getProductsWithStock,
  processManualRestock,
  createInventoryAdjustment,
  upsertRestockRule,
  deleteRestockRule,
  syncWithUnicommerce,
} from "@/app/actions/inventory";
import type { Product, ProductRestockRule } from "@/lib/types";

const DEMO_ORG_ID = "cmkirf3lj0000jhhexsx6p1e3";

type ProductWithRestockRule = Product & {
  restockRule: ProductRestockRule | null;
};

type InventoryMetrics = {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  restocksToday: number;
  adjustmentsToday: number;
  syncStatus: "synced" | "syncing" | "error";
  lastSyncAt?: Date;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithRestockRule[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    restocksToday: 0,
    adjustmentsToday: 0,
    syncStatus: "synced",
  });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRestockRule | null>(null);

  const loadProducts = async () => {
    const result = await getProductsWithStock(DEMO_ORG_ID);
    if (result.success && result.data) {
      setProducts(result.data as ProductWithRestockRule[]);
    }
  };

  const loadMetrics = async () => {
    const result = await getInventoryMetrics(DEMO_ORG_ID);
    if (result.success && result.data) {
      setMetrics(result.data as InventoryMetrics);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadProducts(), loadMetrics()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleRestock = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setRestockModalOpen(true);
    }
  };

  const handleAdjust = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setAdjustModalOpen(true);
    }
  };

  const handleManageRules = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setRulesModalOpen(true);
    }
  };

  const handleSync = async () => {
    setMetrics((prev) => ({ ...prev, syncStatus: "syncing" }));

    const result = await syncWithUnicommerce(DEMO_ORG_ID);

    if (result.success) {
      await loadData();
    } else {
      setMetrics((prev) => ({ ...prev, syncStatus: "error" }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Control</h1>
        <p className="text-muted-foreground">
          Manage stock levels, restock rules, and synchronize with Unicommerce
        </p>
      </div>

      <InventoryDashboard
        products={products}
        metrics={metrics}
        onRestock={handleRestock}
        onAdjust={handleAdjust}
        onManageRules={handleManageRules}
        onSync={handleSync}
      />

      {/* Modals */}
      <ManualRestockModal
        open={restockModalOpen}
        onOpenChange={setRestockModalOpen}
        product={selectedProduct}
        onRestock={processManualRestock}
        onSuccess={loadData}
      />

      <InventoryAdjustmentModal
        open={adjustModalOpen}
        onOpenChange={setAdjustModalOpen}
        product={selectedProduct}
        onAdjust={createInventoryAdjustment}
        onSuccess={loadData}
      />

      <RestockRulesPanel
        open={rulesModalOpen}
        onOpenChange={setRulesModalOpen}
        product={selectedProduct}
        onSave={upsertRestockRule}
        onDelete={deleteRestockRule}
        onSuccess={loadData}
      />
    </div>
  );
}
