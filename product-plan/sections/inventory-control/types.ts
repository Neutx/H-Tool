// =============================================================================
// Data Types
// =============================================================================

export interface RestockQueueItem {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  customerEmail: string
  cancellationReason: string
  productId: string
  productName: string
  sku: string
  variant: string
  quantity: number
  status: 'pending' | 'received' | 'damaged'
  dateCanceled: string
  dateAddedToQueue: string
  dateReceived?: string
  dateMarkedDamaged?: string
  damageDescription?: string
  priority: 'normal' | 'high'
}

export interface InventoryAdjustment {
  id: string
  productId: string
  productName: string
  sku: string
  quantityChange: number
  reason: 'restock' | 'damage' | 'loss' | 'manual_add' | 'manual_remove'
  orderId: string | null
  orderNumber: string | null
  timestamp: string
  userId: string
  userName: string
  notes?: string
  syncStatus: 'synced' | 'pending' | 'failed'
  syncTimestamp: string | null
}

export interface ProductRestockRule {
  id: string
  productId: string
  productName: string
  sku: string
  currentStock: number
  neverAutoRestock: boolean
  ruleReason: string | null
  lastModified: string | null
  modifiedBy: string | null
  modifiedByName: string | null
}

export interface FailedSync {
  id: string
  productId: string
  productName: string
  sku: string
  errorMessage: string
  errorCode: string
  timestamp: string
  retryCount: number
  status: 'pending' | 'retrying' | 'resolved'
  lastRetryAt: string | null
}

export interface DashboardMetrics {
  totalRestockedToday: number
  totalRestockedWeek: number
  totalRestockedMonth: number
  pendingQueueCount: number
  failedSyncCount: number
  productsWithRulesCount: number
  trendIndicator: 'up' | 'down' | 'stable'
}

export interface Product {
  id: string
  name: string
  sku: string
  currentStock: number
  availabilityStatus: 'in_stock' | 'out_of_stock' | 'low_stock'
  inventoryManagementEnabled: boolean
  syncStatus: 'synced' | 'pending' | 'failed'
}

// =============================================================================
// Filter & Search Types
// =============================================================================

export type QueueStatus = 'all' | 'pending' | 'received' | 'damaged'

export type AdjustmentReason = 'all' | 'restock' | 'damage' | 'loss' | 'manual_add' | 'manual_remove'

export interface QueueFilters {
  status: QueueStatus
  dateRange: {
    start: string | null
    end: string | null
  }
  searchQuery: string
}

export interface AuditLogFilters {
  dateRange: {
    start: string | null
    end: string | null
  }
  productSearch: string
  reason: AdjustmentReason
  userId: string | null
  orderNumber: string
}

export interface RulesFilters {
  searchQuery: string
  ruleStatus: 'all' | 'with_rules' | 'without_rules'
  category: string | null
}

// =============================================================================
// Component Props
// =============================================================================

export interface InventoryDashboardProps {
  /** Dashboard metrics for summary cards */
  dashboardMetrics: DashboardMetrics
  /** Recent items from restock queue (top 5-10) */
  queuePreview: RestockQueueItem[]
  /** Recent inventory adjustments (last 10) */
  recentAdjustments: InventoryAdjustment[]
  /** Called when user wants to view full restock queue */
  onViewQueue?: () => void
  /** Called when user wants to view full audit log */
  onViewAuditLog?: () => void
  /** Called when user clicks on pending queue count */
  onViewPendingQueue?: () => void
  /** Called when user clicks on failed sync count */
  onViewFailedSyncs?: () => void
  /** Called when user clicks on products with rules count */
  onViewRestockRules?: () => void
}

export interface RestockQueueProps {
  /** The list of items in the restock queue */
  queueItems: RestockQueueItem[]
  /** Current filter state */
  filters: QueueFilters
  /** Called when filters change */
  onFilterChange?: (filters: QueueFilters) => void
  /** Called when user confirms items are restocked */
  onConfirmRestocked?: (itemIds: string[]) => void
  /** Called when user skips restock for items */
  onSkipRestock?: (itemIds: string[], reason: string) => void
  /** Called when user marks items as received (not yet on shelf) */
  onMarkReceived?: (itemIds: string[]) => void
  /** Called when user marks items as damaged */
  onMarkDamaged?: (itemIds: string[], damageDescription: string) => void
  /** Called when user wants to view order details */
  onViewOrder?: (orderId: string) => void
  /** Called when user wants to view product details */
  onViewProduct?: (productId: string) => void
}

export interface AuditLogProps {
  /** The list of inventory adjustments */
  adjustments: InventoryAdjustment[]
  /** Current filter state */
  filters: AuditLogFilters
  /** Called when filters change */
  onFilterChange?: (filters: AuditLogFilters) => void
  /** Called when user wants to export the log */
  onExport?: (format: 'csv' | 'pdf') => void
  /** Called when user wants to view product details */
  onViewProduct?: (productId: string) => void
  /** Called when user wants to view order details */
  onViewOrder?: (orderId: string) => void
}

export interface RestockRulesProps {
  /** The list of products with their restock rules */
  productRules: ProductRestockRule[]
  /** Current filter state */
  filters: RulesFilters
  /** Called when filters change */
  onFilterChange?: (filters: RulesFilters) => void
  /** Called when user toggles "Never Auto-Restock" for a product */
  onToggleRule?: (productId: string, enabled: boolean, reason?: string) => void
  /** Called when user wants to view product details */
  onViewProduct?: (productId: string) => void
}

export interface ManualAdjustmentModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal should close */
  onClose: () => void
  /** Called to search for a product */
  onSearchProduct: (query: string) => Promise<Product[]>
  /** Called when adjustment is submitted */
  onSubmitAdjustment: (params: {
    productId: string
    adjustmentType: 'add' | 'remove'
    quantity: number
    reason: string
  }) => Promise<void>
}

export interface ProductDetailViewProps {
  /** The product to display */
  product: Product
  /** Recent adjustments for this product */
  adjustments: InventoryAdjustment[]
  /** Restock rule for this product */
  restockRule: ProductRestockRule | null
  /** Pending queue items for this product */
  pendingQueueItems: RestockQueueItem[]
  /** Whether the view is open (if using drawer) */
  isOpen?: boolean
  /** Called when view should close */
  onClose?: () => void
  /** Called when user toggles restock rule */
  onToggleRule?: (enabled: boolean, reason?: string) => void
  /** Called when user wants to make manual adjustment */
  onManualAdjustment?: () => void
}

export interface FailedSyncsViewProps {
  /** The list of failed syncs */
  failedSyncs: FailedSync[]
  /** Called when user retries a single sync */
  onRetrySync?: (syncId: string) => void
  /** Called when user retries all failed syncs */
  onRetryAll?: () => void
  /** Called when user wants to view product details */
  onViewProduct?: (productId: string) => void
}

export interface InventoryControlProps {
  /** Dashboard metrics */
  dashboardMetrics: DashboardMetrics
  /** Restock queue items */
  queueItems: RestockQueueItem[]
  /** Inventory adjustments (audit log) */
  adjustments: InventoryAdjustment[]
  /** Product restock rules */
  productRules: ProductRestockRule[]
  /** Failed syncs */
  failedSyncs: FailedSync[]
  /** Called when user confirms items are restocked */
  onConfirmRestocked?: (itemIds: string[]) => void
  /** Called when user skips restock */
  onSkipRestock?: (itemIds: string[], reason: string) => void
  /** Called when user marks items as received */
  onMarkReceived?: (itemIds: string[]) => void
  /** Called when user marks items as damaged */
  onMarkDamaged?: (itemIds: string[], damageDescription: string) => void
  /** Called when user toggles restock rule */
  onToggleRule?: (productId: string, enabled: boolean, reason?: string) => void
  /** Called when user wants to make manual adjustment */
  onManualAdjustment?: (productId?: string) => void
  /** Called when user retries a sync */
  onRetrySync?: (syncId: string) => void
  /** Called when user retries all failed syncs */
  onRetryAllSyncs?: () => void
  /** Called when user wants to export audit log */
  onExportAuditLog?: (format: 'csv' | 'pdf') => void
  /** Called when user wants to view product details */
  onViewProduct?: (productId: string) => void
  /** Called when user wants to view order details */
  onViewOrder?: (orderId: string) => void
}



