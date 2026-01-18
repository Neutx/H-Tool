// =============================================================================
// Data Types
// =============================================================================

export interface LineItem {
  id: string
  productId: string
  sku: string
  title: string
  quantity: number
  price: number
  variantId: string
  /** Only present for partial refunds - indicates if this item was refunded */
  refunded?: boolean
}

export interface OrderDetails {
  subtotal: number
  tax: number
  shipping: number
  createdAt: string
  cancellationReason: string
  caseInitiatedDate: string
}

export interface InternalNote {
  id: string
  timestamp: string
  userId: string
  userName: string
  content: string
}

export interface RefundTransaction {
  id: string
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  refundAmount: number
  originalOrderTotal: number
  refundType: 'full' | 'partial' | 'none'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retry_in_progress'
  paymentProcessor: string
  transactionId: string | null
  requestedDate: string
  completedDate: string | null
  retryCount: number
  failureReason: string | null
  processingTime: number | null
  lineItems: LineItem[]
  orderDetails: OrderDetails
  internalNotes: InternalNote[]
}

export interface DashboardMetrics {
  totalRefundsToday: number
  totalRefundsWeek: number
  totalRefundsMonth: number
  successRate: number
  failedCount: number
  totalAmountRefunded: number
  trendIndicator: 'up' | 'down' | 'stable'
}

export interface Order {
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  lineItems: LineItem[]
  orderDetails: OrderDetails
  originalOrderTotal: number
  paymentProcessor: string
  transactionId: string | null
}

// =============================================================================
// Filter & Search Types
// =============================================================================

export type RefundStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'retry_in_progress'

export interface RefundFilters {
  status: RefundStatus
  dateRange: {
    start: string | null
    end: string | null
  }
  paymentProcessor: string | null
  searchQuery: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface RefundsDashboardProps {
  /** The list of refund transactions to display */
  refundTransactions: RefundTransaction[]
  /** Dashboard metrics for the summary cards */
  dashboardMetrics: DashboardMetrics
  /** Current filter and search state */
  filters: RefundFilters
  /** Called when user wants to view a refund's details */
  onViewDetails?: (refundId: string) => void
  /** Called when user wants to retry a failed refund */
  onRetry?: (refundId: string) => void
  /** Called when user wants to adjust the refund amount and retry */
  onAdjustAmount?: (refundId: string, newAmount: number, reason: string) => void
  /** Called when user wants to cancel a refund attempt */
  onCancelRefund?: (refundId: string, reason: string) => void
  /** Called when user wants to process a new refund */
  onProcessNewRefund?: () => void
  /** Called when filters change */
  onFilterChange?: (filters: RefundFilters) => void
  /** Called when user clicks on an order number to view order details */
  onViewOrder?: (orderId: string) => void
}

export interface ProcessRefundModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called to search for an order by order number */
  onSearchOrder: (orderNumber: string) => Promise<Order | null>
  /** Called when refund is submitted */
  onSubmitRefund: (params: {
    orderId: string
    refundType: 'full' | 'partial' | 'none'
    refundAmount: number
    selectedLineItems?: string[]
    reason?: string
  }) => Promise<void>
}

export interface RefundDetailsViewProps {
  /** The refund transaction to display */
  refund: RefundTransaction
  /** Whether the view is open (if using drawer) */
  isOpen?: boolean
  /** Called when view should close */
  onClose?: () => void
  /** Called when user wants to retry a failed refund */
  onRetry?: (refundId: string) => void
  /** Called when user wants to adjust the refund amount and retry */
  onAdjustAmount?: (refundId: string, newAmount: number, reason: string) => void
  /** Called when user wants to cancel a refund attempt */
  onCancelRefund?: (refundId: string, reason: string) => void
  /** Called when user adds an internal note */
  onAddNote?: (refundId: string, note: string) => void
  /** Called when user clicks on order number */
  onViewOrder?: (orderId: string) => void
}

export interface RefundManagementProps {
  /** The list of refund transactions to display */
  refundTransactions: RefundTransaction[]
  /** Dashboard metrics for the summary cards */
  dashboardMetrics: DashboardMetrics
  /** Called when user wants to view a refund's details */
  onViewDetails?: (refundId: string) => void
  /** Called when user wants to retry a failed refund */
  onRetry?: (refundId: string) => void
  /** Called when user wants to adjust the refund amount and retry */
  onAdjustAmount?: (refundId: string, newAmount: number, reason: string) => void
  /** Called when user wants to cancel a refund attempt */
  onCancelRefund?: (refundId: string, reason: string) => void
  /** Called when user wants to process a new refund */
  onProcessNewRefund?: () => void
  /** Called when user clicks on an order number to view order details */
  onViewOrder?: (orderId: string) => void
  /** Called to search for an order by order number */
  onSearchOrder?: (orderNumber: string) => Promise<Order | null>
  /** Called when refund is submitted from the modal */
  onSubmitRefund?: (params: {
    orderId: string
    refundType: 'full' | 'partial' | 'none'
    refundAmount: number
    selectedLineItems?: string[]
    reason?: string
  }) => Promise<void>
  /** Called when user adds an internal note */
  onAddNote?: (refundId: string, note: string) => void
}



