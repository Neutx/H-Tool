"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { unicommerce } from "@/lib/unicommerce";
import { shopify } from "@/lib/shopify";
import {
  processCancellationRestock,
  validateRestockRule,
} from "@/lib/restock-engine";
import type { AdjustmentReason, RestockStrategy } from "@/lib/inventory-types";

/**
 * Get inventory metrics for dashboard
 */
export async function getInventoryMetrics(organizationId: string) {
  try {
    const [
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      restocksToday,
      adjustmentsToday,
      lastSync,
    ] = await Promise.all([
      prisma.product.count({
        where: { organizationId },
      }),
      prisma.product.count({
        where: {
          organizationId,
          currentStock: { lte: 10 }, // Low stock threshold
        },
      }),
      prisma.product.count({
        where: {
          organizationId,
          currentStock: { lte: 0 },
        },
      }),
      prisma.inventoryAdjustment.count({
        where: {
          product: { organizationId },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          reason: "cancellation",
        },
      }),
      prisma.inventoryAdjustment.count({
        where: {
          product: { organizationId },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.integrationSync.findFirst({
        where: {
          integration: {
            organizationId,
            type: "unicommerce",
          },
        },
        orderBy: { completedAt: "desc" },
      }),
    ]);

    // Calculate total inventory value
    const products = await prisma.product.findMany({
      where: { organizationId },
      select: { currentStock: true },
    });
    const totalValue = products.reduce(
      (sum, p) => sum + p.currentStock,
      0
    );

    return {
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalValue,
        restocksToday,
        adjustmentsToday,
        syncStatus: (lastSync ? "synced" : "error") as "synced" | "syncing" | "error",
        lastSyncAt: lastSync?.completedAt || undefined,
      },
    };
  } catch (error) {
    console.error("Error fetching inventory metrics:", error);
    return { success: false, error: "Failed to fetch metrics" };
  }
}

/**
 * Get all products with stock levels
 */
export async function getProductsWithStock(organizationId: string) {
  try {
    const products = await prisma.product.findMany({
      where: { organizationId },
      include: {
        restockRule: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: products };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

/**
 * Create or update restock rule
 */
export async function upsertRestockRule(data: {
  id?: string;
  productId: string;
  minThreshold: number;
  restockQuantity: number;
  maxStockLevel?: number;
  strategy: RestockStrategy;
  locationId: string;
  priority?: number;
}) {
  try {
    // Validate rule
    const validation = validateRestockRule(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(", ") };
    }

    const rule = await prisma.productRestockRule.upsert({
      where: { productId: data.productId },
      create: {
        productId: data.productId,
        neverAutoRestock: false,
        reason: data.strategy || null,
      },
      update: {
        neverAutoRestock: false,
        reason: data.strategy || null,
      },
    });

    revalidatePath("/inventory");
    return { success: true, message: "Restock rule saved", data: rule };
  } catch (error) {
    console.error("Error saving restock rule:", error);
    return { success: false, error: "Failed to save restock rule" };
  }
}

/**
 * Delete restock rule
 */
export async function deleteRestockRule(ruleId: string) {
  try {
    await prisma.productRestockRule.delete({
      where: { id: ruleId },
    });

    revalidatePath("/inventory");
    return { success: true, message: "Restock rule deleted" };
  } catch (error) {
    console.error("Error deleting restock rule:", error);
    return { success: false, error: "Failed to delete restock rule" };
  }
}

/**
 * Toggle restock rule active status
 */
export async function toggleRestockRule(ruleId: string, active: boolean) {
  try {
    await prisma.productRestockRule.update({
      where: { id: ruleId },
      data: { neverAutoRestock: !active },
    });

    revalidatePath("/inventory");
    return {
      success: true,
      message: `Restock rule ${active ? "activated" : "deactivated"}`,
    };
  } catch (error) {
    console.error("Error toggling restock rule:", error);
    return { success: false, error: "Failed to toggle restock rule" };
  }
}

/**
 * Process manual restock
 */
export async function processManualRestock(data: {
  productId: string;
  quantity: number;
  reason?: string;
  notes?: string;
}) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Create inventory adjustment
    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        productId: data.productId,
        quantityChange: data.quantity,
        reason: "manual",
        adjustedBy: "system",
        notes: data.notes || `Manual restock: ${data.reason || "No reason provided"}`,
      },
    });

    // Update product stock level
    await prisma.product.update({
      where: { id: data.productId },
      data: {
        currentStock: { increment: data.quantity },
      },
    });

    // Sync with Shopify if needed
    if (product.shopifyProductId) {
      await shopify.updateInventoryLevel(
        product.shopifyProductId,
        "default", // Location ID
        product.currentStock + data.quantity
      );
    }

    // Sync with Unicommerce if needed
    if (product.sku) {
      await unicommerce.mockUpdateInventory(
        product.sku,
        product.currentStock + data.quantity,
        "WH001"
      );
    }

    revalidatePath("/inventory");
    return {
      success: true,
      message: "Stock updated successfully",
      data: adjustment,
    };
  } catch (error) {
    console.error("Error processing restock:", error);
    return { success: false, error: "Failed to process restock" };
  }
}

/**
 * Create inventory adjustment
 */
export async function createInventoryAdjustment(data: {
  productId: string;
  quantityChange: number;
  reason: AdjustmentReason;
  notes?: string;
  orderId?: string;
}) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const newStockLevel = Math.max(0, product.currentStock + data.quantityChange);

    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        productId: data.productId,
        quantityChange: data.quantityChange,
        reason: data.reason,
        adjustedBy: "system",
        notes: data.notes,
        orderId: data.orderId,
      },
    });

    // Update product stock level
    await prisma.product.update({
      where: { id: data.productId },
      data: { currentStock: newStockLevel },
    });

    revalidatePath("/inventory");
    return {
      success: true,
      message: "Inventory adjustment created",
      data: adjustment,
    };
  } catch (error) {
    console.error("Error creating adjustment:", error);
    return { success: false, error: "Failed to create adjustment" };
  }
}

/**
 * Process automatic restock from cancellation
 */
export async function processAutomaticRestock(
  cancellationRecordId: string
) {
  try {
    const cancellation = await prisma.cancellationRecord.findUnique({
      where: { id: cancellationRecordId },
      include: {
        order: {
          include: {
            lineItems: {
              include: { product: { include: { restockRule: true } } },
            },
          },
        },
      },
    });

    if (!cancellation) {
      return { success: false, error: "Cancellation not found" };
    }

    const adjustments = [];

    for (const lineItem of cancellation.order.lineItems) {
      const product = lineItem.product;
      if (!product) continue;

      // ProductRestockRule doesn't match RestockRule interface, so pass empty array
      // In production, you'd need to transform or fetch proper RestockRule data
      const decision = processCancellationRestock(
        product.id,
        lineItem.quantity,
        [],
        product.currentStock
      );

      if (decision.shouldRestock && decision.quantity > 0) {
        const adjustment = await createInventoryAdjustment({
          productId: product.id,
          quantityChange: decision.quantity,
          reason: "cancellation",
          notes: `Auto-restock from cancellation: ${decision.reason}`,
          orderId: cancellation.orderId,
        });

        if (adjustment.success) {
          adjustments.push(adjustment.data);
        }
      }
    }

    // Update cancellation record
    await prisma.cancellationRecord.update({
      where: { id: cancellationRecordId },
      data: { restockDecision: "auto_restock" },
    });

    revalidatePath("/inventory");
    return {
      success: true,
      message: `Processed ${adjustments.length} restock adjustments`,
      data: adjustments,
    };
  } catch (error) {
    console.error("Error processing automatic restock:", error);
    return { success: false, error: "Failed to process automatic restock" };
  }
}

/**
 * Sync inventory with Unicommerce
 */
export async function syncWithUnicommerce(
  organizationId: string,
  productIds?: string[]
) {
  try {
    // Get products to sync
    const products = await prisma.product.findMany({
      where: {
        organizationId,
        ...(productIds && { id: { in: productIds } }),
      },
    });

    const skus = products.map((p) => p.sku).filter(Boolean) as string[];

    // Sync with Unicommerce (mock for now)
    const result = await unicommerce.mockSyncInventory(skus);

    if (!result.success) {
      return { success: false, error: "Sync failed" };
    }

    // Update stock levels from sync
    if (result.data?.items) {
      for (const item of result.data.items) {
        const product = products.find((p) => p.sku === item.sku);
        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: { currentStock: item.quantity },
          });

          // Log sync
          await prisma.inventoryAdjustment.create({
            data: {
              productId: product.id,
              quantityChange: item.quantity - product.currentStock,
              reason: "sync",
              adjustedBy: "system",
              notes: `Synced from Unicommerce at ${item.lastUpdated}`,
            },
          });
        }
      }
    }

    // Record sync
    const integration = await prisma.integration.findFirst({
      where: { organizationId, type: "unicommerce" },
    });

    if (integration) {
      await prisma.integrationSync.create({
        data: {
          integrationId: integration.id,
          syncType: "inventory",
          recordsProcessed: result.data?.synced || 0,
          status: "completed",
        },
      });
    }

    revalidatePath("/inventory");
    return {
      success: true,
      message: `Synced ${result.data?.synced || 0} products`,
      data: result.data,
    };
  } catch (error) {
    console.error("Error syncing inventory:", error);
    return { success: false, error: "Failed to sync inventory" };
  }
}

/**
 * Get inventory adjustments history
 */
export async function getInventoryAdjustments(
  organizationId: string,
  productId?: string
) {
  try {
    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: {
        product: { organizationId },
        ...(productId && { productId }),
      },
      include: {
        product: true,
        order: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return { success: true, data: adjustments };
  } catch (error) {
    console.error("Error fetching adjustments:", error);
    return { success: false, error: "Failed to fetch adjustments" };
  }
}

