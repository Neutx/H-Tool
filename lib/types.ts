/**
 * H-Tool Type Definitions
 * Shared types across the application
 */

import { Prisma } from "@prisma/client";

// ============================================
// Prisma Type Helpers
// ============================================

export type Order = Prisma.OrderGetPayload<{
  include: { lineItems: true; customer: true };
}>;

export type LineItem = Prisma.LineItemGetPayload<{}>;

export type Customer = Prisma.CustomerGetPayload<{}>;

export type CancellationRequest = Prisma.CancellationRequestGetPayload<{
  include: { order: true; customer: true };
}>;

export type CancellationRecord = Prisma.CancellationRecordGetPayload<{
  include: { order: true; customer: true; refundTransactions: true };
}>;

export type RefundTransaction = Prisma.RefundTransactionGetPayload<{
  include: { order: true };
}>;

export type InventoryAdjustment = Prisma.InventoryAdjustmentGetPayload<{
  include: { product: true };
}>;

export type Product = Prisma.ProductGetPayload<{}>;

export type Rule = Prisma.RuleGetPayload<{}>;

export type RuleTemplate = Prisma.RuleTemplateGetPayload<{}>;

export type ReviewQueueItem = Prisma.ReviewQueueItemGetPayload<{
  include: { order: true; cancellationRequest: true };
}>;

export type ProductRestockRule = Prisma.ProductRestockRuleGetPayload<{
  include: { product: true };
}>;

export type Integration = Prisma.IntegrationGetPayload<{}>;

export type IntegrationSync = Prisma.IntegrationSyncGetPayload<{}>;

export type FailedSync = Prisma.FailedSyncGetPayload<{
  include: { product: true; integration: true };
}>;

export type OrderStatusUpdate = Prisma.OrderStatusUpdateGetPayload<{
  include: { order: true };
}>;

export type User = Prisma.UserGetPayload<{}>;

export type Organization = Prisma.OrganizationGetPayload<{}>;

export type TeamMember = Prisma.TeamMemberGetPayload<{
  include: { user: true };
}>;

// ============================================
// Enum Types
// ============================================

export enum OrderStatus {
  OPEN = "open",
  PENDING = "pending",
  CANCELLED = "cancelled",
  FULFILLED = "fulfilled",
}

export enum FulfillmentStatus {
  UNFULFILLED = "unfulfilled",
  PARTIAL = "partial",
  FULFILLED = "fulfilled",
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
}

export enum CancellationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  DENIED = "denied",
  PROCESSING = "processing",
  COMPLETED = "completed",
}

export enum RefundStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  DENIED = "denied",
  INFO_REQUESTED = "info_requested",
  ESCALATED = "escalated",
}

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum InitiatedBy {
  CUSTOMER = "customer",
  MERCHANT = "merchant",
  SYSTEM = "system",
}

export enum RefundPreference {
  FULL = "full",
  PARTIAL = "partial",
  NONE = "none",
}

export enum RestockDecision {
  AUTO_RESTOCK = "auto_restock",
  MANUAL_RESTOCK = "manual_restock",
  NO_RESTOCK = "no_restock",
}

export enum AvailabilityStatus {
  IN_STOCK = "in_stock",
  OUT_OF_STOCK = "out_of_stock",
  LOW_STOCK = "low_stock",
}

export enum IntegrationType {
  SHOPIFY = "shopify",
  SAGEPILOT = "sagepilot",
  UNICOMMERCE = "unicommerce",
  DELHIVERY = "delhivery",
  BLUEDART = "bluedart",
}

export enum SyncStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  ERROR = "error",
}

export enum TeamMemberRole {
  ADMIN = "admin",
  WAREHOUSE_MANAGER = "warehouse_manager",
  SUPPORT_AGENT = "support_agent",
}

// ============================================
// UI Component Types
// ============================================

export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState<T> {
  key: keyof T;
  direction: "asc" | "desc";
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Form Types
// ============================================

export interface CreateRuleFormData {
  name: string;
  description?: string;
  conditions: RuleConditions;
  actions: RuleActions;
  priority?: number;
  active?: boolean;
}

export interface RuleConditions {
  timeWindow?: number; // in minutes
  userType?: InitiatedBy[];
  riskLevel?: RiskLevel[];
  orderStatus?: OrderStatus[];
  fulfillmentStatus?: FulfillmentStatus[];
  paymentStatus?: PaymentStatus[];
  minOrderAmount?: number;
  maxOrderAmount?: number;
}

export interface RuleActions {
  type: "auto_approve" | "manual_review" | "deny" | "escalate";
  notifyCustomer?: boolean;
  notifyMerchant?: boolean;
}

export interface ProcessRefundFormData {
  cancellationRequestId: string;
  refundType: RefundPreference;
  refundAmount?: number;
  reason?: string;
  items?: {
    lineItemId: string;
    quantity: number;
    amount: number;
  }[];
}

export interface ManualAdjustmentFormData {
  productId: string;
  quantityChange: number;
  reason: string;
  notes?: string;
}

export interface CancellationRequestFormData {
  orderId: string;
  reason: string;
  reasonCategory: string;
  notes?: string;
  refundPreference: RefundPreference;
}

// ============================================
// WebSocket Types
// ============================================

export interface WebSocketMessage {
  type: "cancellation_status_update" | "order_status_update" | "notification";
  payload: any;
}

export interface CancellationStatusUpdate {
  cancellationRequestId: string;
  status: CancellationStatus;
  timestamp: Date;
  details?: any;
}

// ============================================
// Analytics Types
// ============================================

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface MetricsData {
  totalCancellations: number;
  cancellationRate: number;
  averageRefundAmount: number;
  refundSuccessRate: number;
  topCancellationReasons: ReasonBreakdown[];
  fraudAlerts: FraudAlert[];
}

export interface ReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

export interface FraudAlert {
  id: string;
  customerId: string;
  pattern: string;
  severity: RiskLevel;
  timestamp: Date;
}

