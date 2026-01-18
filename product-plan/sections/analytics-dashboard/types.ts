// =============================================================================
// Data Types
// =============================================================================

export interface CancellationRecord {
  id: string
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  initiatedBy: 'customer' | 'merchant' | 'system'
  initiatedById: string
  initiatedTimestamp: string
  reason: 'customer' | 'inventory' | 'fraud' | 'paymentDeclined' | 'other'
  reasonDescription: string
  refundAmount: number
  refundStatus: 'completed' | 'pending' | 'failed' | 'rejected' | 'not_applicable'
  refundTransactionId: string | null
  restockDecision: 'restocked' | 'not_applicable' | 'pending'
  customerNotified: boolean
  completionTimestamp: string | null
  status: 'completed' | 'failed' | 'pending' | 'rejected'
  fraudRiskLevel: 'low' | 'medium' | 'high'
  timeWindow: '15min' | '1hour' | '24hour' | 'manual' | 'system'
  processingTime: number | null
  orderCreatedAt: string
  timeToCancel: number
  failureReason?: string
}

export interface MetricsPeriod {
  range: string
  startDate: string
  endDate: string
  totalCancellations: number
  cancellationRate: number
  totalOrders: number
  refundSuccessRate: number
  totalRefunded: number
  averageRefundAmount: number
  initiatorSplit: {
    customer: number
    merchant: number
    system: number
  }
  reasonBreakdown: {
    customer: number
    inventory: number
    fraud: number
    paymentDeclined: number
    other: number
  }
  statusBreakdown: {
    completed: number
    failed: number
    pending: number
  }
  fraudRiskPercentage: number
  averageTimeToCancel: number
}

export interface Metrics {
  currentPeriod: MetricsPeriod
  comparisonPeriod: MetricsPeriod | null
  trends: {
    cancellationRateChange: number
    refundSuccessRateChange: number
    totalCancellationsChange: number
    fraudRiskChange: number
  }
}

export interface TimelineEvent {
  id: string
  timestamp: string
  eventType:
    | 'request_initiated'
    | 'validation_started'
    | 'validation_passed'
    | 'validation_failed'
    | 'auto_approved'
    | 'manual_review'
    | 'reviewed'
    | 'refund_initiated'
    | 'refund_completed'
    | 'refund_failed'
    | 'inventory_restocked'
    | 'customer_notified'
    | 'cancellation_completed'
    | 'cancellation_rejected'
    | 'fraud_check'
  description: string
  actor: string
  actorType: 'customer' | 'merchant' | 'system'
  details: Record<string, unknown>
}

export interface CancellationTimeline {
  cancellationRecordId: string
  events: TimelineEvent[]
}

export interface ActivityLog {
  id: string
  timestamp: string
  eventType:
    | 'cancellation_requested'
    | 'cancellation_completed'
    | 'cancellation_rejected'
    | 'refund_initiated'
    | 'refund_completed'
    | 'refund_failed'
    | 'inventory_restocked'
    | 'customer_notified'
    | 'fraud_alert'
    | 'manual_review'
    | 'system_action'
  description: string
  actor: string
  actorType: 'customer' | 'merchant' | 'system'
  cancellationRecordId: string | null
  orderNumber: string | null
  customerName: string | null
  details: Record<string, unknown>
}

export interface FraudAlert {
  id: string
  cancellationRecordId: string
  orderNumber: string
  orderId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  riskLevel: 'low' | 'medium' | 'high'
  riskScore: number
  rejectionReason: string
  rejectedAt: string | null
  rejectedBy: string | null
  riskFactors: string[]
  orderAmount: number
  orderCreatedAt: string
  timeToCancel: number
  status: 'rejected' | 'pending'
}

// =============================================================================
// Filter Types
// =============================================================================

export interface CancellationRecordFilters {
  status?: ('completed' | 'failed' | 'pending' | 'rejected')[]
  reason?: ('customer' | 'inventory' | 'fraud' | 'paymentDeclined' | 'other')[]
  customerId?: string
  customerName?: string
  dateRange?: {
    startDate: string
    endDate: string
  }
  refundStatus?: ('completed' | 'pending' | 'failed' | 'rejected' | 'not_applicable')[]
  fraudRiskLevel?: ('low' | 'medium' | 'high')[]
  initiatedBy?: ('customer' | 'merchant' | 'system')[]
  searchQuery?: string
}

export interface ActivityLogFilters {
  eventType?: ActivityLog['eventType'][]
  actorType?: ('customer' | 'merchant' | 'system')[]
  dateRange?: {
    startDate: string
    endDate: string
  }
  searchQuery?: string
}

export type TimeRange = 'L7D' | 'L14D' | 'L30D' | 'L90D' | 'custom'

// =============================================================================
// Component Props
// =============================================================================

export interface AnalyticsDashboardProps {
  /** Aggregated metrics for the selected time period */
  metrics: Metrics
  /** List of all cancellation records */
  cancellationRecords: CancellationRecord[]
  /** Activity logs showing all system events */
  activityLogs: ActivityLog[]
  /** Fraud alerts showing rejected cancellation requests */
  fraudAlerts: FraudAlert[]
  /** Timeline events for each cancellation record */
  timelines: CancellationTimeline[]
  /** Currently selected time range */
  selectedTimeRange?: TimeRange
  /** Whether comparison mode is enabled */
  compareEnabled?: boolean
  /** Called when user changes the time range */
  onTimeRangeChange?: (range: TimeRange) => void
  /** Called when user toggles comparison mode */
  onCompareToggle?: (enabled: boolean) => void
  /** Called when user selects a custom date range */
  onCustomDateRangeSelect?: (startDate: string, endDate: string) => void
  /** Called when user filters cancellation records */
  onFilterRecords?: (filters: CancellationRecordFilters) => void
  /** Called when user searches cancellation records */
  onSearchRecords?: (query: string) => void
  /** Called when user clicks on a cancellation record to view details */
  onViewRecordDetails?: (recordId: string) => void
  /** Called when user filters activity logs */
  onFilterActivityLogs?: (filters: ActivityLogFilters) => void
  /** Called when user exports a report */
  onExportReport?: (format: 'csv' | 'pdf', dateRange?: { startDate: string; endDate: string }) => void
}


