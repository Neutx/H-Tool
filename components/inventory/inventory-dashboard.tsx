"use client";

import { Package, AlertTriangle, TrendingDown, DollarSign, RefreshCw, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface InventoryDashboardProps {
  products: Product[];
  metrics: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalValue: number;
    restocksToday: number;
    adjustmentsToday: number;
    syncStatus: "synced" | "syncing" | "error";
    lastSyncAt?: Date;
  };
  onRestock: (productId: string) => void;
  onAdjust: (productId: string) => void;
  onManageRules: (productId: string) => void;
  onSync: () => void;
}

export function InventoryDashboard({
  products,
  metrics,
  onRestock,
  onAdjust,
  onManageRules,
  onSync,
}: InventoryDashboardProps) {
  const getStockStatus = (stockLevel: number, restockRule?: { minThreshold: number }) => {
    if (stockLevel <= 0) {
      return { variant: "error" as const, label: "Out of Stock", color: "text-red-600" };
    }
    if (restockRule && stockLevel <= restockRule.minThreshold) {
      return { variant: "warning" as const, label: "Low Stock", color: "text-amber-600" };
    }
    return { variant: "success" as const, label: "In Stock", color: "text-emerald-600" };
  };

  const getSyncStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
      synced: { variant: "success", label: "Synced", icon: CheckCircle },
      syncing: { variant: "warning", label: "Syncing", icon: RefreshCw },
      error: { variant: "error", label: "Error", icon: AlertTriangle },
    };
    return variants[status] || variants.error;
  };

  const syncStatus = getSyncStatusBadge(metrics.syncStatus);
  const SyncIcon = syncStatus.icon;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.outOfStockProducts} out of stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Activity</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.adjustmentsToday}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.restocksToday} restocks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Unicommerce Sync Status</CardTitle>
            <Button onClick={onSync} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge {...syncStatus}>
              <SyncIcon className="mr-1 h-3 w-3" />
              {syncStatus.label}
            </Badge>
            {metrics.lastSyncAt && (
              <span className="text-sm text-muted-foreground">
                Last synced: {formatDateTime(metrics.lastSyncAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Products</CardTitle>
            <div className="flex gap-2">
              <Badge variant="warning">{metrics.lowStockProducts} Low</Badge>
              <Badge variant="error">{metrics.outOfStockProducts} Out</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const status = getStockStatus(product.stockLevel, product.restockRule);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{product.title}</span>
                        <Badge {...status}>{status.label}</Badge>
                        {product.restockRule && (
                          <Badge variant="secondary">
                            Auto-restock: {product.restockRule.strategy}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>SKU: {product.sku}</span>
                        <span>•</span>
                        <span className={`font-medium ${status.color}`}>
                          Stock: {product.stockLevel}
                        </span>
                        <span>•</span>
                        <span>{formatCurrency(product.price)}</span>
                        {product.restockRule && (
                          <>
                            <span>•</span>
                            <span>
                              Min: {product.restockRule.minThreshold}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestock(product.id)}
                      >
                        Restock
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAdjust(product.id)}
                      >
                        Adjust
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onManageRules(product.id)}
                      >
                        Rules
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

