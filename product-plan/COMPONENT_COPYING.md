# Component Copying Instructions

This file explains how to copy components from `src/sections/` to `product-plan/sections/`.

## Transformation Required

When copying components, you need to transform import paths:

**From:**
```tsx
import type { Rule } from '@/../product/sections/cancellation-rules-engine/types'
```

**To:**
```tsx
import type { Rule } from '../types'
```

## Steps

1. Copy component files from `src/sections/[section-id]/components/*.tsx` to `product-plan/sections/[section-id]/components/`
2. Copy `src/sections/[section-id]/components/index.ts` to `product-plan/sections/[section-id]/components/index.ts`
3. Copy `product/sections/[section-id]/types.ts` to `product-plan/sections/[section-id]/types.ts`
4. Copy `product/sections/[section-id]/data.json` to `product-plan/sections/[section-id]/sample-data.json`
5. Transform all import paths:
   - `@/../product/sections/[section-id]/types` → `../types`
   - Remove any Design OS-specific imports
6. Ensure components are self-contained (no dependencies on Design OS)

## Sections to Copy

- `cancellation-rules-engine/` — RulesDashboard, ReviewQueue
- `refund-management/` — RefundsDashboard, RefundMetrics, ProcessRefundModal, RefundDetailsDrawer
- `inventory-control/` — InventoryDashboard, InventoryMetrics, RestockQueue, RestockRules, AuditLog, ManualAdjustmentModal
- `customer-portal/` — PhoneAuth, CustomerDashboard, OrderList, OrderDetails, CancellationFlow, NotificationList
- `analytics-dashboard/` — AnalyticsDashboard, MetricsSection, FraudAlertsSection, CancellationRecordsTable, ActivityLogsSection, TimelineDrawer

## Note

The preview wrapper files (e.g., `src/sections/[section-id]/[Component].tsx`) should NOT be copied — they are Design OS-specific.


