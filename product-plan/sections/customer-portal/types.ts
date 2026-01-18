// =============================================================================
// Data Types
// =============================================================================

export interface Customer {
  id: string
  phoneNumber: string
  name: string
  email: string
  isAuthenticated: boolean
  authenticatedAt: string
}

export interface ShippingAddress {
  name: string
  address1: string
  address2?: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
}

export interface LineItem {
  id: string
  productId: string
  sku: string
  title: string
  variant: string
  quantity: number
  price: number
  totalPrice: number
}

export interface Order {
  id: string
  orderNumber: string
  status: 'open' | 'pending' | 'fulfilled' | 'cancelled' | 'archived'
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked'
  paymentStatus: 'authorized' | 'paid' | 'pending' | 'declined' | 'voided' | 'refunded'
  financialStatus: 'pending' | 'authorized' | 'paid' | 'partially_paid' | 'refunded' | 'voided'
  totalPrice: number
  subtotalPrice: number
  totalTax: number
  totalShipping: number
  createdAt: string
  updatedAt: string
  fulfilledAt?: string
  cancelledAt?: string
  shippingAddress: ShippingAddress
  canCancel: boolean
  timeWindowStatus: 'within_15min' | 'within_1hour' | 'within_24hours' | 'beyond_24hours' | 'fulfilled' | 'cancelled'
  lineItems: LineItem[]
}

export interface CancellationRequest {
  id: string
  orderId: string
  orderNumber: string
  reason: 'customer' | 'inventory' | 'fraud' | 'declined' | 'other'
  description: string
  notes: string | null
  status: 'pending' | 'processing' | 'approved' | 'rejected'
  requestedAt: string
  timeWindowStatus: 'within_15min' | 'within_1hour' | 'within_24hours' | 'beyond_24hours'
  estimatedApprovalTime: 'instant' | 'quick' | 'escalated'
}

export interface StatusTimelineItem {
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed'
  timestamp: string
  message: string
}

export interface CancellationRecord {
  id: string
  orderId: string
  orderNumber: string
  customerId: string
  initiatedBy: 'customer' | 'merchant' | 'system'
  initiatedAt: string
  reason: 'customer' | 'inventory' | 'fraud' | 'declined' | 'other'
  reasonDescription: string
  refundAmount: number
  refundStatus: 'pending' | 'processing' | 'completed' | 'failed'
  refundTransactionId: string | null
  restockDecision: boolean
  customerNotified: boolean
  completedAt: string | null
  status: 'completed' | 'failed' | 'processing'
  statusTimeline: StatusTimelineItem[]
  estimatedRefundTimeline: string
  failureReason?: string
}

export interface Notification {
  id: string
  type: 'cancellation_approved' | 'refund_processing' | 'refund_completed' | 'refund_failed' | 'status_update'
  title: string
  message: string
  orderId: string
  orderNumber: string
  timestamp: string
  read: boolean
  actionUrl: string
}

export interface RefundTransaction {
  id: string
  transactionId: string
  orderId: string
  orderNumber: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  paymentProcessor: 'razorpay' | 'stripe' | 'paypal' | 'other'
  retryCount: number
  createdAt: string
  completedAt: string | null
  estimatedCompletion: string | null
  failureReason?: string
}

// =============================================================================
// Component Props
// =============================================================================

export interface CustomerPortalProps {
  /** The authenticated customer */
  customer: Customer
  /** List of customer orders */
  orders: Order[]
  /** Active cancellation requests */
  cancellationRequests: CancellationRequest[]
  /** Completed cancellation history */
  cancellationRecords: CancellationRecord[]
  /** In-app notifications */
  notifications: Notification[]
  /** Refund transaction details */
  refundTransactions: RefundTransaction[]
  /** Called when customer wants to authenticate with phone number */
  onAuthenticate?: (phoneNumber: string) => Promise<void>
  /** Called when customer submits OTP */
  onVerifyOTP?: (otp: string) => Promise<void>
  /** Called when customer wants to view order details */
  onViewOrder?: (orderId: string) => void
  /** Called when customer wants to request cancellation */
  onRequestCancellation?: (orderId: string, reason: string, notes?: string) => Promise<void>
  /** Called when customer wants to view cancellation status */
  onViewCancellationStatus?: (cancellationId: string) => void
  /** Called when customer wants to view cancellation history */
  onViewCancellationHistory?: () => void
  /** Called when customer wants to request manual review for order outside time window */
  onRequestManualReview?: (orderId: string, reason: string, notes?: string) => Promise<void>
  /** Called when customer marks a notification as read */
  onMarkNotificationRead?: (notificationId: string) => void
  /** Called when customer wants to view all notifications */
  onViewNotifications?: () => void
}

export interface OrderHistoryProps {
  /** List of customer orders */
  orders: Order[]
  /** Called when customer selects an order to view details */
  onSelectOrder?: (orderId: string) => void
  /** Called when customer wants to request cancellation for an order */
  onRequestCancellation?: (orderId: string) => void
}

export interface OrderDetailsProps {
  /** The order to display */
  order: Order
  /** Whether cancellation is available for this order */
  canCancel: boolean
  /** Called when customer wants to request cancellation */
  onRequestCancellation?: () => void
  /** Called when customer wants to request manual review (for orders outside time window) */
  onRequestManualReview?: () => void
  /** Called when customer wants to go back to order history */
  onBack?: () => void
}

export interface CancellationRequestFormProps {
  /** The order being canceled */
  order: Order
  /** Called when cancellation request is submitted */
  onSubmit?: (reason: string, notes?: string) => Promise<void>
  /** Called when form is cancelled */
  onCancel?: () => void
}

export interface CancellationStatusProps {
  /** The active cancellation request */
  cancellationRequest: CancellationRequest
  /** The cancellation record if available */
  cancellationRecord?: CancellationRecord
  /** The refund transaction if available */
  refundTransaction?: RefundTransaction
  /** Called when customer wants to view order details */
  onViewOrder?: (orderId: string) => void
  /** Called when customer wants to go back */
  onBack?: () => void
}

export interface CancellationHistoryProps {
  /** List of completed cancellation records */
  cancellationRecords: CancellationRecord[]
  /** Called when customer wants to view details of a cancellation */
  onViewCancellation?: (cancellationId: string) => void
  /** Called when customer wants to view order details */
  onViewOrder?: (orderId: string) => void
}

export interface ManualReviewRequestFormProps {
  /** The order that needs manual review */
  order: Order
  /** Called when manual review request is submitted */
  onSubmit?: (reason: string, notes?: string) => Promise<void>
  /** Called when form is cancelled */
  onCancel?: () => void
}

export interface NotificationListProps {
  /** List of notifications */
  notifications: Notification[]
  /** Called when customer marks a notification as read */
  onMarkRead?: (notificationId: string) => void
  /** Called when customer clicks on a notification */
  onNotificationClick?: (notification: Notification) => void
  /** Called when customer wants to mark all as read */
  onMarkAllRead?: () => void
}

export interface PhoneAuthProps {
  /** Called when phone number is submitted */
  onPhoneSubmit?: (phoneNumber: string) => Promise<void>
  /** Whether OTP has been sent */
  otpSent: boolean
  /** Called when OTP is submitted */
  onOTPSubmit?: (otp: string) => Promise<void>
  /** Called when OTP needs to be resent */
  onResendOTP?: () => Promise<void>
  /** Error message if authentication fails */
  error?: string | null
}



