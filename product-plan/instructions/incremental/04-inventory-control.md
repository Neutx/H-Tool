# Milestone 4: Inventory Control

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

[Include preamble from 02-cancellation-rules-engine.md]

## Goal

Implement the Inventory Control feature — automatically restocks canceled items to Shopify inventory with intelligent decision logic.

## Overview

The Inventory Control section manages automatic and manual restocking of items after order cancellations. It provides a Restock Queue where warehouse managers confirm items are back on shelves, a complete audit log of all inventory adjustments, product-level restock rules configuration, and real-time sync with Unicommerce.

**Key Functionality:**
- View inventory metrics (items restocked, pending queue, failed syncs)
- Review and process restock queue items
- Configure per-product restock rules
- View complete audit log of inventory adjustments
- Make manual stock adjustments (add/remove)
- Track failed syncs with Unicommerce

## Components

- `InventoryDashboard.tsx` — Main dashboard
- `InventoryMetrics.tsx` — Metrics display
- `RestockQueue.tsx` — Restock queue management
- `RestockRules.tsx` — Product restock rules configuration
- `AuditLog.tsx` — Inventory audit log
- `ManualAdjustmentModal.tsx` — Manual stock adjustment modal

## Callbacks

- `onConfirmRestock` — Confirm items restocked
- `onSkipRestock` — Skip restock (damaged/clearance)
- `onMarkReceived` — Mark items received but not yet on shelf
- `onMarkDamaged` — Mark items as damaged
- `onUpdateRestockRule` — Update product restock rule
- `onManualAdjustment` — Make manual stock adjustment
- `onFilterQueue` — Filter restock queue
- `onFilterAuditLog` — Filter audit log

## Expected User Flows

### Flow 1: Process Restock Queue Item
1. Warehouse manager views restock queue
2. Manager sees pending item with order context
3. Manager confirms items are back on shelf
4. **Outcome:** Items restocked, inventory updated, item removed from queue

### Flow 2: Configure Restock Rule
1. Merchant navigates to Restock Rules
2. Merchant finds product and toggles "Never auto-restock"
3. Merchant adds reason (e.g., "Clearance item")
4. **Outcome:** Rule saved, product excluded from auto-restocking

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


