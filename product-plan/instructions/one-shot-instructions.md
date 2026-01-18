# H-Tool — Complete Implementation Instructions

---

## About These Instructions

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Data model definitions (TypeScript types and sample data)
- UI/UX specifications (user flows, requirements, screenshots)
- Design system tokens (colors, typography, spacing)
- Test-writing instructions for each section (for TDD approach)

**What you need to build:**
- Backend API endpoints and database schema
- Authentication and authorization
- Data fetching and state management
- Business logic and validation
- Integration of the provided UI components with real data

**Important guidelines:**
- **DO NOT** redesign or restyle the provided components — use them as-is
- **DO** wire up the callback props to your routing and API calls
- **DO** replace sample data with real data from your backend
- **DO** implement proper error handling and loading states
- **DO** implement empty states when no records exist (first-time users, after deletions)
- **DO** use test-driven development — write tests first using `tests.md` instructions
- The components are props-based and ready to integrate — focus on the backend and data layer

---

## Test-Driven Development

Each section includes a `tests.md` file with detailed test-writing instructions. These are **framework-agnostic** — adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, RSpec, Minitest, PHPUnit, etc.).

**For each section:**
1. Read `product-plan/sections/[section-id]/tests.md`
2. Write failing tests for key user flows (success and failure paths)
3. Implement the feature to make tests pass
4. Refactor while keeping tests green

The test instructions include:
- Specific UI elements, button labels, and interactions to verify
- Expected success and failure behaviors
- Empty state handling (when no records exist yet)
- Data assertions and state validations

---

# Milestone 1: Foundation

## Goal

Set up the foundational elements: design tokens, data model types, routing structure, and application shell.

## What to Implement

### 1. Design Tokens

Configure your styling system with these tokens:

- See `product-plan/design-system/tokens.css` for CSS custom properties
- See `product-plan/design-system/tailwind-colors.md` for Tailwind configuration
- See `product-plan/design-system/fonts.md` for Google Fonts setup

**Color Palette:**
- Primary: `emerald` — Used for buttons, links, key accents, success states
- Secondary: `amber` — Used for tags, highlights, secondary elements, warnings
- Neutral: `slate` — Used for backgrounds, text, borders

**Typography:**
- Heading & Body: `Inter` (Google Fonts)
- Mono: `JetBrains Mono` (Google Fonts)

### 2. Data Model Types

Create TypeScript interfaces for your core entities:

- See `product-plan/data-model/README.md` for entity relationships

**Key Entities:**
- Order, LineItem, Customer
- CancellationRequest, CancellationRecord
- RefundTransaction, InventoryAdjustment
- Product, Rule, RuleTemplate, ReviewQueueItem
- ProductRestockRule, FailedSync, Integration, IntegrationSync, OrderStatusUpdate

### 3. Routing Structure

Create placeholder routes for each section:

- `/cancellation-rules` — Cancellation Rules Engine
- `/refunds` — Refund Management
- `/inventory` — Inventory Control
- `/customer-portal` — Customer Portal (standalone, no shell)
- `/analytics` — Analytics Dashboard

### 4. Application Shell

**Note:** The application shell components are not yet designed. You'll need to create your own shell with:

- Navigation for all sections (except Customer Portal which is standalone)
- User menu with avatar
- Responsive layout (mobile, tablet, desktop)
- Dark mode support

**Navigation Items:**
- Cancellation Rules
- Refunds
- Inventory
- Analytics

## Done When

- [ ] Design tokens are configured
- [ ] Data model types are defined
- [ ] Routes exist for all sections (can be placeholder pages)
- [ ] Shell renders with navigation
- [ ] Navigation links to correct routes
- [ ] User menu shows user info
- [ ] Responsive on mobile
- [ ] Dark mode works correctly

---

# Milestone 2: Cancellation Rules Engine

## Goal

Implement the Cancellation Rules Engine feature — the intelligent automation core that validates cancellation requests and determines approval routing.

## Overview

The Cancellation Rules Engine allows merchants to configure automation rules that determine how cancellation requests are handled. Merchants can activate pre-built rule templates, customize conditions and actions, and manage a manual review queue for flagged orders that require human decision-making.

**Key Functionality:**
- View all automation rules with status, conditions, actions, priority, and usage stats
- Activate pre-built rule templates
- Edit existing rules
- Toggle rule status
- Manage rule priority
- Review flagged orders in manual review queue
- Approve/deny cancellations
- Request additional customer information
- Escalate orders
- Add audit notes

## Components

- `RulesDashboard.tsx` — Main dashboard showing all rules
- `ReviewQueue.tsx` — Manual review queue for flagged orders

## Callbacks

- `onCreateRule`, `onEditRule`, `onDeleteRule`
- `onToggleRuleStatus`, `onReorderRules`, `onActivateTemplate`
- `onFilterRules`, `onSearchRules`
- `onApproveCancellation`, `onDenyCancellation`, `onRequestInfo`, `onEscalate`, `onAddNotes`

## Expected User Flows

### Flow 1: Create a New Rule from Template
1. User clicks "New Rule" or "Activate Template"
2. User selects a pre-built template
3. User customizes conditions and actions
4. User clicks "Save"
5. **Outcome:** New rule appears in the rules list

### Flow 2: Review and Approve Flagged Order
1. User navigates to Review Queue
2. User sees list of flagged orders
3. User clicks on an order to view full details
4. User reviews information
5. User clicks "Approve"
6. **Outcome:** Order is approved, removed from review queue

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Components render with real data
- [ ] Empty states display properly
- [ ] All user actions work
- [ ] User can complete all expected flows end-to-end
- [ ] Matches the visual design
- [ ] Responsive on mobile

---

# Milestone 3: Refund Management

## Goal

Implement the Refund Management feature — processes the complete refund lifecycle via Shopify API with intelligent error handling.

## Overview

The Refund Management section handles payment processing, refund transactions, and automatic retry logic for failed refunds. Merchants can view all refund transactions, process new refunds (full, partial, or none), and manually intervene when automated refunds fail.

**Key Functionality:**
- View all refund transactions with status, amounts, and payment processor info
- Process new refunds (full, partial, or no refund)
- Search and filter refunds
- View refund details
- Handle failed refunds with manual retry
- Track refund metrics

## Components

- `RefundsDashboard.tsx` — Main dashboard with metrics and refunds table
- `RefundMetrics.tsx` — Key metrics display
- `ProcessRefundModal.tsx` — Multi-step refund processing modal
- `RefundDetailsDrawer.tsx` — Detailed refund information drawer

## Callbacks

- `onProcessRefund`, `onViewDetails`, `onRetryRefund`
- `onFilterRefunds`, `onSearchRefunds`, `onExportReport`

## Expected User Flows

### Flow 1: Process Full Refund
1. User clicks "Process Refund" on a canceled order
2. User selects "Full Refund" type
3. System calculates refund amount
4. User confirms and processes refund
5. **Outcome:** Refund processed successfully

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Components render with real data
- [ ] Empty states display properly
- [ ] All user actions work
- [ ] Refund processing works end-to-end
- [ ] Retry logic handles failures correctly
- [ ] Matches the visual design
- [ ] Responsive on mobile

---

# Milestone 4: Inventory Control

## Goal

Implement the Inventory Control feature — automatically restocks canceled items to Shopify inventory with intelligent decision logic.

## Overview

The Inventory Control section manages automatic and manual restocking of items after order cancellations. It provides a Restock Queue where warehouse managers confirm items are back on shelves, a complete audit log of all inventory adjustments, product-level restock rules configuration, and real-time sync with Unicommerce.

**Key Functionality:**
- View inventory metrics
- Review and process restock queue items
- Configure per-product restock rules
- View complete audit log
- Make manual stock adjustments
- Track failed syncs

## Components

- `InventoryDashboard.tsx` — Main dashboard
- `InventoryMetrics.tsx` — Metrics display
- `RestockQueue.tsx` — Restock queue management
- `RestockRules.tsx` — Product restock rules configuration
- `AuditLog.tsx` — Inventory audit log
- `ManualAdjustmentModal.tsx` — Manual stock adjustment modal

## Callbacks

- `onConfirmRestock`, `onSkipRestock`, `onMarkReceived`, `onMarkDamaged`
- `onUpdateRestockRule`, `onManualAdjustment`
- `onFilterQueue`, `onFilterAuditLog`

## Expected User Flows

### Flow 1: Process Restock Queue Item
1. Warehouse manager views restock queue
2. Manager sees pending item with order context
3. Manager confirms items are back on shelf
4. **Outcome:** Items restocked, inventory updated

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Components render with real data
- [ ] Empty states display properly
- [ ] All user actions work
- [ ] Restock queue processing works
- [ ] Audit log displays correctly
- [ ] Matches the visual design
- [ ] Responsive on mobile

---

# Milestone 5: Customer Portal

## Goal

Implement the Customer Portal feature — customer-facing self-service cancellation interface with phone number OTP authentication.

## Overview

Customer-facing self-service cancellation portal with phone number OTP authentication. Customers can view their order history, request cancellations with time-window validation, track cancellation status in real time, and view their cancellation history.

**Key Functionality:**
- Phone number + OTP authentication
- View order history
- View full order details
- Request cancellation with reason selection
- Track cancellation status in real-time
- View cancellation history
- Receive in-app notifications

## Components

- `PhoneAuth.tsx` — Phone number + OTP authentication
- `CustomerDashboard.tsx` — Main dashboard with orders and notifications
- `OrderList.tsx` — Order history list
- `OrderDetails.tsx` — Full order details view
- `CancellationFlow.tsx` — Cancellation request form and status tracking
- `NotificationList.tsx` — In-app notifications

## Callbacks

- `onAuthenticate`, `onViewOrder`, `onRequestCancellation`
- `onViewCancellationHistory`, `onDismissNotification`

## Expected User Flows

### Flow 1: Authenticate and View Orders
1. Customer enters phone number
2. Customer receives and enters OTP
3. Customer is authenticated
4. **Outcome:** Customer sees order history and dashboard

### Flow 2: Request Cancellation
1. Customer selects order from history
2. Customer views order details
3. Customer clicks "Request Cancellation"
4. Customer selects reason and adds notes
5. Customer submits request
6. **Outcome:** Cancellation request submitted, status tracking shown

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Components render with real data
- [ ] Empty states display properly
- [ ] Authentication flow works
- [ ] All user actions work
- [ ] Cancellation flow works end-to-end
- [ ] Matches the visual design
- [ ] Responsive on mobile (critical for customer portal)

---

# Milestone 6: Analytics Dashboard

## Goal

Implement the Analytics Dashboard feature — comprehensive analytics and audit trail system tracking every cancellation with permanent records.

## Overview

The Analytics Dashboard provides a single source of truth for all cancellation data. It displays real-time metrics, trends, and comprehensive audit trails. Merchants can view cancellation rates, refund success rates, reason breakdowns, fraud patterns, and drill down into detailed step-by-step cancellation records.

**Key Functionality:**
- View metrics dashboard with key KPIs
- Filter metrics by time range with comparison mode
- View charts showing trends and reason breakdowns
- View fraud pattern alerts
- Filter and search cancellation records
- Drill down into individual cancellation records with complete timeline
- View activity logs
- Export reports

## Components

- `AnalyticsDashboard.tsx` — Main dashboard
- `MetricsSection.tsx` — Key metrics with time range selector
- `FraudAlertsSection.tsx` — Fraud pattern alerts
- `CancellationRecordsTable.tsx` — Records table with filtering
- `ActivityLogsSection.tsx` — Activity logs
- `TimelineDrawer.tsx` — Detailed timeline drawer

## Callbacks

- `onTimeRangeChange`, `onCompareToggle`, `onCustomDateRangeSelect`
- `onFilterRecords`, `onSearchRecords`, `onViewRecordDetails`
- `onFilterActivityLogs`, `onExportReport`

## Expected User Flows

### Flow 1: View Metrics with Comparison
1. User selects time range (e.g., L7D)
2. User enables comparison mode
3. User views metrics with trend indicators
4. **Outcome:** User sees current period vs previous period comparison

### Flow 2: Drill Down into Cancellation Record
1. User clicks on a cancellation record in the table
2. Timeline drawer opens showing complete process
3. User views step-by-step events from request to completion
4. **Outcome:** User has complete visibility into cancellation process

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Components render with real data
- [ ] Empty states display properly
- [ ] All user actions work
- [ ] Metrics calculate correctly
- [ ] Timeline drawer shows complete process
- [ ] Matches the visual design
- [ ] Responsive on mobile

---

## Component Copying

See `COMPONENT_COPYING.md` for instructions on copying components from `src/sections/` to `product-plan/sections/`. You'll need to transform import paths when copying.


