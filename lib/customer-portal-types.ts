/**
 * Customer Portal Types
 * Types for the public-facing self-service cancellation portal
 */

export type CancellationStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "denied"
  | "info_requested";

export type ReasonCategory =
  | "changed_mind"
  | "found_better_price"
  | "ordered_by_mistake"
  | "delivery_delay"
  | "product_issue"
  | "other";

export interface OrderLookup {
  orderNumber: string;
  email: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  orderDate: Date;
  totalAmount: number;
  status: string;
  customer: {
    name?: string;
    email: string | null;
  };
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    price: number;
    totalPrice: number;
    imageUrl?: string;
  }>;
  cancellationRequest?: {
    id: string;
    status: CancellationStatus;
    reason: string;
    reasonCategory: ReasonCategory;
    createdAt: Date;
    updatedAt: Date;
    customerNotes?: string;
    adminResponse?: string;
    refundPreference?: string;
  };
}

export interface CancellationRequestData {
  orderId: string;
  reason: string;
  reasonCategory: ReasonCategory;
  customerNotes?: string;
  refundPreference?: "full" | "partial" | "store_credit" | "none";
}

export interface StatusUpdate {
  id: string;
  status: CancellationStatus;
  message: string;
  timestamp: Date;
  updatedBy: "customer" | "system" | "admin";
}

export interface CancellationTimeline {
  requested: Date;
  approved?: Date;
  processing?: Date;
  refunded?: Date;
  completed?: Date;
  denied?: Date;
}

