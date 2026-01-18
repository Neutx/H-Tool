# Refund Management

## Overview

The Refund Management section handles payment processing, refund transactions, and automatic retry logic for failed refunds. Merchants can view all refund transactions, process new refunds (full, partial, or none), and manually intervene when automated refunds fail.

**Key Goals:**
- Provide visibility into all refund transactions and their statuses
- Enable merchants to process refunds with full control (full, partial, or no refund)
- Handle failed refunds gracefully with automatic retry logic
- Allow manual intervention for failed refunds (retry, adjust amount, cancel)
- Track refund history and payment processor performance

---

## User Flows

### 1. View Refunds Dashboard
**Actor:** Merchant  
**Goal:** See all refund transactions at a glance

**Steps:**
1. Navigate to "Refunds" in main navigation
2. View refunds dashboard with list of all refund transactions
3. See key metrics: total refunds (today/week/month), success rate, failed count
4. View table with: refund ID, order number, customer name/phone, amount, status, payment processor, timestamp, retry count

**Success:** Merchant has complete visibility into refund activity

---

### 2. Search & Filter Refunds
**Actor:** Merchant  
**Goal:** Find specific refunds or analyze refund patterns

**Steps:**
1. Use search bar to find refunds by order number or customer name/phone
2. Apply filters:
   - Refund status (all, pending, processing, completed, failed, retry in progress)
   - Date range
   - Payment processor
3. View filtered results in real-time

**Success:** Merchant quickly finds relevant refund transactions

---

### 3. Process New Refund
**Actor:** Merchant  
**Goal:** Initiate a refund for a canceled order

**Steps:**
1. Click "Process Refund" button
2. Search/select order by order number
3. View order details before deciding:
   - Customer name and phone number
   - Case initiated date/time
   - Cancellation reason
   - Order status (tracking information)
   - Line items with prices
   - Original total amount
   - Payment status and processor
4. Choose refund type:
   - **Full Refund**: Entire order amount
   - **Partial Refund**: Select specific line items or enter custom amount
   - **No Refund**: Cancel order without refunding (for special cases)
5. Review refund summary (amount, items, taxes)
6. Confirm and submit refund

**Success:** Refund is initiated and tracked in the dashboard

---

### 4. Review Order Details Before Refund
**Actor:** Merchant  
**Goal:** Make informed refund decision with complete order context

**Steps:**
1. View selected order's complete details:
   - Customer information (name, phone, email)
   - Order number and creation date
   - Cancellation case information (initiated date, reason)
   - Current order status and tracking
   - Line items breakdown (SKU, quantity, price)
   - Payment information (processor, transaction ID, amount)
2. Assess refund eligibility based on order state
3. Proceed to refund type selection

**Success:** Merchant has all necessary information to decide on refund approach

---

### 5. Process Full Refund
**Actor:** Merchant  
**Goal:** Refund entire order amount

**Steps:**
1. Select "Full Refund" option
2. System auto-calculates: subtotal + tax + shipping
3. View refund breakdown
4. Confirm refund
5. System processes refund via payment processor

**Success:** Full refund initiated, customer will receive complete amount back

---

### 6. Process Partial Refund
**Actor:** Merchant  
**Goal:** Refund only specific items or a custom amount

**Steps:**
1. Select "Partial Refund" option
2. Choose approach:
   - **Item-level**: Select specific line items to refund
   - **Custom amount**: Enter specific dollar amount
3. System calculates tax allocation automatically
4. Review partial refund breakdown
5. Confirm refund
6. System processes partial refund

**Success:** Partial refund initiated for selected items/amount

---

### 7. Choose No Refund
**Actor:** Merchant  
**Goal:** Cancel order without processing refund

**Steps:**
1. Select "No Refund" option
2. Enter reason for no refund (required)
3. Confirm decision
4. Order marked as canceled but unrefunded

**Success:** Order canceled, refund skipped, decision logged for audit

---

### 8. Monitor Refund Status
**Actor:** Merchant  
**Goal:** Track progress of initiated refunds

**Steps:**
1. View refund in dashboard
2. See real-time status updates:
   - **Pending**: Queued for processing
   - **Processing**: Being sent to payment processor
   - **Completed**: Successfully refunded
   - **Failed**: Payment processor error
   - **Retry in Progress**: Automatic retry attempt active
3. View timestamp for each status change
4. See retry count for failed refunds

**Success:** Merchant knows exactly where each refund stands

---

### 9. Handle Failed Refund
**Actor:** Merchant  
**Goal:** Resolve a failed refund transaction

**Steps:**
1. See "Failed" status in refunds dashboard
2. Click on failed refund to view details
3. See failure reason (e.g., "Payment processor timeout", "Invalid transaction ID")
4. View automatic retry history (attempts, timestamps)
5. Choose action:
   - **Retry Refund**: Manually trigger another attempt
   - **Adjust Amount**: Change refund amount and retry
   - **Cancel Refund**: Stop refund process entirely
6. Add internal notes about resolution

**Success:** Failed refund is resolved or escalated appropriately

---

### 10. Manually Retry Failed Refund
**Actor:** Merchant  
**Goal:** Retry a refund that failed automatic retries

**Steps:**
1. Select failed refund from dashboard
2. Click "Retry Refund" button
3. Confirm retry attempt
4. System attempts refund again
5. View updated status (processing → completed or failed again)

**Success:** Refund successfully processed after manual retry

---

### 11. Adjust Refund Amount for Failed Refund
**Actor:** Merchant  
**Goal:** Change refund amount and retry (e.g., processor only accepts certain amounts)

**Steps:**
1. Select failed refund from dashboard
2. Click "Adjust Amount" button
3. Enter new refund amount
4. Add reason for adjustment (optional)
5. Confirm and retry with new amount
6. System processes adjusted refund

**Success:** Refund succeeds with adjusted amount

---

### 12. Cancel Failed Refund
**Actor:** Merchant  
**Goal:** Stop attempting refund (e.g., will issue store credit instead)

**Steps:**
1. Select failed refund from dashboard
2. Click "Cancel Refund" button
3. Enter reason for cancellation (required)
4. Confirm cancellation
5. Refund marked as "Canceled" (no further retries)
6. Order remains canceled but unrefunded

**Success:** Refund attempts stopped, alternative resolution can proceed

---

## UI Requirements

### 1. Refunds Dashboard (Main View)
- **Header**: "Refund Management" with "Process Refund" button (top right)
- **Metrics Cards** (top row):
  - Total Refunds Today/Week/Month (with trend indicator)
  - Refund Success Rate (percentage)
  - Failed Refunds Count (highlighted if > 0)
  - Total Amount Refunded (currency)
- **Search & Filters Bar**:
  - Search input: "Search by order number, customer name/phone..."
  - Status filter dropdown: All, Pending, Processing, Completed, Failed, Retry in Progress
  - Date range picker
  - Payment processor filter dropdown (Shopify Payments, PayPal, Stripe, etc.)
- **Refunds Table** (responsive, sortable columns):
  - Refund ID (clickable)
  - Order Number (clickable link)
  - Customer Name & Phone
  - Refund Amount (currency with original order total)
  - Status Badge (color-coded: pending=yellow, processing=blue, completed=green, failed=red, retry=orange)
  - Payment Processor
  - Requested Date/Time
  - Completed Date/Time (if applicable)
  - Retry Count (shows number if > 0, badge if actively retrying)
  - Actions menu (three dots): View Details, Retry (if failed), Adjust (if failed), Cancel (if failed)
- **Pagination**: Show 25/50/100 per page

### 2. Process Refund Modal
- **Step 1: Select Order**
  - Search input: "Enter order number..."
  - Display matching order or error message
- **Step 2: Review Order Details** (card layout)
  - Customer section: Name, Phone, Email
  - Order section: Order number, Creation date, Status badge
  - Cancellation section: Case initiated date, Reason tag
  - Items section: Table with SKU, Product name, Quantity, Price
  - Payment section: Processor name, Transaction ID, Original amount
  - Totals: Subtotal, Tax, Shipping, **Total**
- **Step 3: Choose Refund Type** (radio buttons with descriptions)
  - ○ Full Refund — Refund entire order amount ($XXX.XX)
  - ○ Partial Refund — Select items or enter custom amount
  - ○ No Refund — Cancel order without refunding
- **Step 4: Configure Refund** (conditional based on type)
  - **If Full**: Show auto-calculated breakdown (subtotal, tax, shipping)
  - **If Partial**: 
    - Checkbox list of line items (with prices)
    - OR custom amount input field
    - Tax allocation (auto-calculated)
    - Refund summary
  - **If No Refund**: Text area for reason (required)
- **Step 5: Confirm & Submit**
  - Final summary card
  - "Process Refund" button (primary, emerald)
  - "Cancel" button (secondary)

### 3. Refund Details View (Drawer or Full Page)
- **Header**: Refund ID, Status badge, Order number link
- **Timeline** (vertical, left-aligned):
  - Refund requested (timestamp, user)
  - Processing started (timestamp)
  - Retry attempts (if applicable, with failure reasons)
  - Completed/Failed (timestamp)
- **Order Information Card**:
  - Customer details
  - Order number, date, status
  - Line items refunded
- **Refund Details Card**:
  - Refund type (full/partial/none)
  - Amount breakdown (subtotal, tax, shipping)
  - Payment processor
  - Transaction ID
  - Retry count
- **Actions Section** (if failed):
  - "Retry Refund" button (primary)
  - "Adjust Amount" button (secondary)
  - "Cancel Refund" button (destructive, red)
- **Internal Notes Section**:
  - Read-only notes from previous actions
  - Text area to add new note
  - "Save Note" button

### 4. Empty States
- **No refunds yet**: Illustration, "No refunds have been processed", "Process your first refund" button
- **No search results**: "No refunds match your search", "Clear filters" button
- **No failed refunds**: Success illustration, "All refunds are processing successfully!"

### 5. Loading & Error States
- **Loading refunds**: Skeleton table rows
- **Processing refund**: Loading spinner on modal, "Processing refund..." message
- **Refund success**: Success toast notification, "Refund processed successfully"
- **Refund failure**: Error toast with failure reason, "Refund failed - click to retry"

---

## Technical Notes

- **Real-time updates**: Refund status should update automatically (polling or webhooks)
- **Automatic retry logic**: System retries failed refunds 3 times with exponential backoff (1s, 2s, 4s)
- **Audit trail**: All actions (process, retry, adjust, cancel) logged with user ID and timestamp
- **Payment processor integration**: Support multiple processors (Shopify Payments, PayPal, Stripe, etc.)
- **Notifications**: Email customers when refund is completed
- **Mobile responsive**: Table should collapse to cards on mobile devices

---

## Display Configuration

```yaml
shell: true
```

This section displays inside the application shell with main navigation.

