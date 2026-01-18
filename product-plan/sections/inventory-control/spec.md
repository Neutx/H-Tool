# Inventory Control

## Overview

The Inventory Control section manages automatic and manual restocking of items after order cancellations. It provides a Restock Queue where warehouse managers confirm items are back on shelves, a complete audit log of all inventory adjustments, product-level restock rules configuration, and real-time sync with Unicommerce. This section ensures inventory accuracy and prevents overselling by maintaining a single source of truth for stock levels.

**Key Goals:**
- Provide visibility into all inventory adjustments and restocking activity
- Enable warehouse managers to confirm restocked items from canceled orders
- Allow merchants to configure per-product restock rules (e.g., "Never auto-restock")
- Maintain complete audit trail of all inventory changes
- Sync inventory levels with Unicommerce in real-time
- Support manual stock adjustments (add/remove) for damage and loss

---

## User Flows

### 1. View Inventory Dashboard
**Actor:** Merchant / Warehouse Manager  
**Goal:** See overview of inventory activity and pending tasks

**Steps:**
1. Navigate to "Inventory" in main navigation
2. View dashboard with metrics:
   - Total items restocked (today/week/month)
   - Pending items in queue count
   - Failed sync count (Unicommerce sync failures)
   - Products with "never restock" rules count
3. See Restock Queue section with pending items
4. View recent inventory adjustments in audit log

**Success:** User has complete visibility into inventory activity

---

### 2. Review Restock Queue
**Actor:** Warehouse Manager  
**Goal:** Process pending restocking tasks from canceled orders

**Steps:**
1. View Restock Queue tab/list
2. See pending items with order context:
   - Order number and customer name
   - Cancellation reason
   - Product details (SKU, name, quantity)
   - Date canceled
3. Filter queue by status (pending, received, damaged)
4. Sort by priority or date

**Success:** Warehouse manager can see all items waiting for restock confirmation

---

### 3. Confirm Items Restocked
**Actor:** Warehouse Manager  
**Goal:** Mark items as successfully restocked back on shelf

**Steps:**
1. Select item(s) from Restock Queue
2. Click "Confirm Restocked" action
3. System updates inventory levels in Shopify
4. Syncs with Unicommerce automatically
5. Item removed from queue, added to audit log

**Success:** Inventory levels updated, items available for sale again

---

### 4. Skip Restock (Damaged/Clearance)
**Actor:** Warehouse Manager  
**Goal:** Mark items that should not be restocked (damaged, clearance, etc.)

**Steps:**
1. Select item(s) from Restock Queue
2. Click "Skip Restock" action
3. Enter reason (required): "Damaged", "Clearance", "Inventory mismatch", etc.
4. System logs decision in audit trail
5. Item removed from queue, inventory NOT updated

**Success:** Item marked as not restocked, reason logged for audit

---

### 5. Mark Items as Received (Not Yet on Shelf)
**Actor:** Warehouse Manager  
**Goal:** Track items that have been received but not yet placed on shelf

**Steps:**
1. Select item(s) from Restock Queue
2. Click "Mark as Received" action
3. Item status changes to "Received - Pending Shelf Placement"
4. Item remains in queue with updated status
5. Can later confirm restocked once on shelf

**Success:** Item status updated, tracking intermediate state

---

### 6. Mark Damaged Item Received
**Actor:** Warehouse Manager  
**Goal:** Record items that were received but are damaged

**Steps:**
1. Select item(s) from Restock Queue
2. Click "Damaged Item Received" action
3. Enter damage description (required)
4. System logs as damaged, does NOT restock
5. Item removed from queue, marked in audit log

**Success:** Damaged item recorded, inventory not updated, audit trail created

---

### 7. View Inventory Audit Log
**Actor:** Merchant / Warehouse Manager  
**Goal:** Review complete history of all inventory adjustments

**Steps:**
1. Navigate to "Audit Log" tab/section
2. View chronological list of all adjustments:
   - Date and time
   - Product (SKU, name)
   - Quantity change (+/-)
   - Reason (restock, damage, loss, manual adjustment)
   - Order number (if from cancellation)
   - User who made the change
3. Filter by date range, product, reason, or user
4. Search by SKU, product name, or order number
5. Export log to CSV/PDF

**Success:** User can trace every inventory change with full context

---

### 8. Configure Product Restock Rules
**Actor:** Merchant  
**Goal:** Set per-product rules for automatic restocking behavior

**Steps:**
1. Navigate to "Restock Rules" tab/section
2. View list of products with current restock settings
3. Search or filter products by name, SKU, or category
4. Toggle "Never Auto-Restock" for specific products
5. See indicator badges (e.g., "Clearance - won't restock")
6. Save changes
7. Rules apply to future cancellations (popup in refund flow shows indicators)

**Success:** Products configured to skip auto-restock when canceled

---

### 9. Manual Stock Adjustment (Add Stock)
**Actor:** Merchant  
**Goal:** Manually add inventory for a product (e.g., found stock, supplier delivery)

**Steps:**
1. Navigate to "Manual Adjustments" or product detail
2. Search/select product
3. Click "Add Stock" action
4. Enter quantity to add
5. Enter reason (required): "Found stock", "Supplier delivery", etc.
6. Confirm adjustment
7. System updates Shopify inventory
8. Syncs with Unicommerce
9. Adjustment logged in audit trail

**Success:** Inventory increased, synced, and logged

---

### 10. Manual Stock Adjustment (Remove Stock)
**Actor:** Merchant  
**Goal:** Manually remove inventory (e.g., damage, loss, theft)

**Steps:**
1. Navigate to "Manual Adjustments" or product detail
2. Search/select product
3. Click "Remove Stock" action
4. Enter quantity to remove
5. Enter reason (required): "Damage", "Loss", "Theft", etc.
6. Confirm adjustment
7. System updates Shopify inventory
8. Syncs with Unicommerce
9. Adjustment logged in audit trail

**Success:** Inventory decreased, synced, and logged

---

### 11. View Product Inventory Details
**Actor:** Merchant / Warehouse Manager  
**Goal:** See current stock levels and adjustment history for a specific product

**Steps:**
1. Click on product from Restock Queue, Audit Log, or Rules list
2. View product details:
   - Current stock level (from Shopify/Unicommerce)
   - Recent adjustments (last 10-20)
   - Restock rules status
   - Pending queue items (if any)
3. See sync status with Unicommerce
4. View full adjustment history

**Success:** User has complete context for a product's inventory state

---

### 12. Handle Unicommerce Sync Failures
**Actor:** Merchant  
**Goal:** Resolve failed inventory syncs with Unicommerce

**Steps:**
1. See "Failed Sync Count" metric on dashboard
2. Click to view failed syncs list
3. See error details (network error, API timeout, authentication issue)
4. Click "Retry Sync" for individual failures
5. Or "Retry All Failed" for bulk retry
6. View sync status updates in real-time

**Success:** Failed syncs resolved, inventory levels synchronized

---

## UI Requirements

### 1. Inventory Dashboard (Main View)
- **Header**: "Inventory Control" with tabs: Dashboard, Restock Queue, Audit Log, Restock Rules
- **Metrics Cards** (top row):
  - Total Items Restocked Today/Week/Month (with trend indicator)
  - Pending Items in Queue (highlighted if > 0, clickable to queue)
  - Failed Sync Count (highlighted if > 0, clickable to failed syncs)
  - Products with "Never Restock" Rules (count with link to rules page)
- **Restock Queue Preview** (below metrics):
  - Table/card list of top 5-10 pending items
  - Columns: Order #, Product, Quantity, Status, Date, Actions
  - "View All" link to full queue
- **Recent Adjustments** (audit log preview):
  - Last 10 adjustments with timestamp, product, quantity change, reason
  - "View Full Log" link

### 2. Restock Queue View
- **Header**: "Restock Queue" with filter/search bar
- **Filters**:
  - Status: All, Pending, Received, Damaged
  - Date range picker
  - Search by order number, SKU, product name
- **Queue Table** (sortable columns):
  - Checkbox (for bulk actions)
  - Order Number (clickable, shows order context)
  - Customer Name
  - Cancellation Reason (badge/tag)
  - Product (SKU, name, variant)
  - Quantity
  - Status Badge (Pending, Received, Damaged)
  - Date Canceled
  - Actions dropdown: Confirm Restocked, Skip Restock, Mark as Received, Damaged Item Received
- **Bulk Actions Bar** (when items selected):
  - "Confirm Restocked (X items)"
  - "Skip Restock (X items)" with reason input
- **Empty State**: "No items in queue" illustration

### 3. Audit Log View
- **Header**: "Inventory Audit Log" with export button
- **Filters**:
  - Date range (required or default to last 30 days)
  - Product search (SKU, name)
  - Reason filter (Restock, Damage, Loss, Manual Add, Manual Remove)
  - User filter
  - Order number search
- **Log Table** (chronological, newest first):
  - Timestamp
  - Product (SKU, name, link to product detail)
  - Quantity Change (+5, -2, etc. with color coding)
  - Reason (badge/tag)
  - Order Number (if applicable, clickable)
  - User (who made the change)
  - Sync Status (Synced, Pending, Failed)
- **Export Options**: CSV, PDF with current filters applied
- **Pagination**: 50/100/200 per page

### 4. Restock Rules Configuration View
- **Header**: "Restock Rules" with search bar
- **Product List** (table or cards):
  - Product name, SKU, current stock level
  - "Never Auto-Restock" toggle switch
  - Indicator badge if rule is active ("Clearance", "Damaged", etc.)
  - Last modified date
- **Search/Filter**:
  - Search by product name or SKU
  - Filter by rule status (all, with rules, without rules)
  - Filter by category (if available)
- **Bulk Actions** (future): "Apply rule to selected products" (noted for future development)
- **Empty State**: "No rules configured" with guidance

### 5. Manual Stock Adjustment Modal
- **Step 1: Select Product**
  - Search input for product name/SKU
  - Display matching products
- **Step 2: Choose Adjustment Type**
  - Radio buttons: "Add Stock" or "Remove Stock"
- **Step 3: Enter Details**
  - Quantity input (number, required)
  - Reason textarea (required, with suggestions: "Found stock", "Damage", "Loss", "Theft", etc.)
  - Current stock level display
  - Preview of new stock level
- **Step 4: Confirm**
  - Summary card with all details
  - "Apply Adjustment" button
  - "Cancel" button

### 6. Product Detail View (Drawer or Modal)
- **Header**: Product name, SKU, current stock level
- **Tabs**: Overview, Adjustments, Rules
- **Overview Tab**:
  - Current stock (from Shopify/Unicommerce)
  - Sync status with Unicommerce
  - Restock rule status
  - Pending queue items (if any)
- **Adjustments Tab**:
  - Recent adjustments for this product (last 20)
  - Timeline view with dates, quantities, reasons
- **Rules Tab**:
  - Current restock rule setting
  - Toggle to enable/disable "Never Auto-Restock"
  - Rule history (when it was changed, by whom)

### 7. Failed Syncs View
- **Header**: "Failed Syncs" with "Retry All" button
- **Failed Syncs List**:
  - Product (SKU, name)
  - Error message
  - Timestamp
  - Retry button (individual)
  - View details (expandable error log)
- **Bulk Actions**: "Retry All Failed Syncs"

### 8. Empty States
- **No items in queue**: Illustration, "All items have been processed", "Items will appear here when orders are canceled"
- **No adjustments in log**: "No inventory adjustments found for this period", adjust filters
- **No failed syncs**: Success illustration, "All syncs are working correctly!"

### 9. Loading & Error States
- **Loading queue**: Skeleton table rows
- **Syncing inventory**: Loading spinner with "Syncing with Unicommerce..." message
- **Sync success**: Success toast, "Inventory synced successfully"
- **Sync failure**: Error toast with retry button

---

## Technical Notes

- **Unicommerce Integration**: Real-time sync of inventory levels after every adjustment
- **Conditional Queue Entry**: Items enter queue based on fulfillment status and product rules (conditions to be specified later)
- **Audit Trail**: Every adjustment logged with timestamp, user, reason, and order context
- **Real-time Updates**: Queue and metrics update automatically when items are processed
- **Mobile Responsive**: Tables collapse to cards on mobile, touch-friendly actions

---

## Display Configuration

```yaml
shell: true
```

This section displays inside the application shell with main navigation.



