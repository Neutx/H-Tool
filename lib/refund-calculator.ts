/**
 * Refund Calculation Logic
 * Handles full, partial, and custom refund calculations
 */

import type { Order, LineItem } from "@/lib/types";

export interface RefundCalculation {
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalRefund: number;
  items: Array<{
    lineItemId: string;
    title: string;
    quantity: number;
    pricePerUnit: number;
    totalPrice: number;
    taxAmount: number;
  }>;
}

/**
 * Calculate full refund amount
 */
export function calculateFullRefund(order: Order): RefundCalculation {
  const items = order.lineItems.map((item) => ({
    lineItemId: item.id,
    title: item.title,
    quantity: item.quantity,
    pricePerUnit: item.price,
    totalPrice: item.totalPrice,
    taxAmount: item.taxAmount || 0,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const shippingAmount = 0; // TODO: Extract shipping from order data

  return {
    subtotal,
    taxAmount,
    shippingAmount,
    totalRefund: order.totalAmount,
    items,
  };
}

/**
 * Calculate partial refund for specific items
 */
export function calculatePartialRefund(
  order: Order,
  selectedItems: Array<{
    lineItemId: string;
    quantity: number;
  }>
): RefundCalculation {
  const items = selectedItems
    .map((selected) => {
      const lineItem = order.lineItems.find((li) => li.id === selected.lineItemId);
      if (!lineItem) return null;

      const pricePerUnit = lineItem.price;
      const totalPrice = pricePerUnit * selected.quantity;
      const taxPerUnit = (lineItem.taxAmount || 0) / lineItem.quantity;
      const taxAmount = taxPerUnit * selected.quantity;

      return {
        lineItemId: lineItem.id,
        title: lineItem.title,
        quantity: selected.quantity,
        pricePerUnit,
        totalPrice,
        taxAmount,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const shippingAmount = 0;

  return {
    subtotal,
    taxAmount,
    shippingAmount,
    totalRefund: subtotal + taxAmount + shippingAmount,
    items,
  };
}

/**
 * Calculate custom refund amount
 */
export function calculateCustomRefund(
  order: Order,
  customAmount: number
): RefundCalculation {
  // Proportionally distribute custom amount across items
  const totalOrderAmount = order.totalAmount;
  const ratio = customAmount / totalOrderAmount;

  const items = order.lineItems.map((item) => {
    const proportionalPrice = item.totalPrice * ratio;
    const proportionalTax = (item.taxAmount || 0) * ratio;

    return {
      lineItemId: item.id,
      title: item.title,
      quantity: item.quantity,
      pricePerUnit: item.price,
      totalPrice: proportionalPrice,
      taxAmount: proportionalTax,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);

  return {
    subtotal,
    taxAmount,
    shippingAmount: 0,
    totalRefund: customAmount,
    items,
  };
}

/**
 * Validate refund amount
 */
export function validateRefundAmount(
  requestedAmount: number,
  order: Order,
  existingRefunds: number = 0
): {
  valid: boolean;
  error?: string;
  maxRefundable: number;
} {
  const maxRefundable = order.totalAmount - existingRefunds;

  if (requestedAmount <= 0) {
    return {
      valid: false,
      error: "Refund amount must be greater than 0",
      maxRefundable,
    };
  }

  if (requestedAmount > maxRefundable) {
    return {
      valid: false,
      error: `Refund amount cannot exceed ${maxRefundable.toFixed(2)}`,
      maxRefundable,
    };
  }

  return {
    valid: true,
    maxRefundable,
  };
}

