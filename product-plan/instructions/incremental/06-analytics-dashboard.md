# Milestone 6: Analytics Dashboard

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

[Include preamble from 02-cancellation-rules-engine.md]

## Goal

Implement the Analytics Dashboard feature — comprehensive analytics and audit trail system tracking every cancellation with permanent records.

## Overview

The Analytics Dashboard provides a single source of truth for all cancellation data. It displays real-time metrics, trends, and comprehensive audit trails. Merchants can view cancellation rates, refund success rates, reason breakdowns, fraud patterns, and drill down into detailed step-by-step cancellation records.

**Key Functionality:**
- View metrics dashboard with key KPIs (cancellation rate, refund success rate, total cancellations)
- Filter metrics by time range (L7D, L14D, L30D, L90D, custom) with comparison mode
- View charts showing trends over time and reason breakdowns
- View fraud pattern alerts showing rejected cancellation requests
- Filter and search cancellation records by multiple criteria
- Drill down into individual cancellation records with complete timeline
- View activity logs showing all events chronologically
- Export reports

## Components

- `AnalyticsDashboard.tsx` — Main dashboard
- `MetricsSection.tsx` — Key metrics with time range selector
- `FraudAlertsSection.tsx` — Fraud pattern alerts
- `CancellationRecordsTable.tsx` — Records table with filtering
- `ActivityLogsSection.tsx` — Activity logs
- `TimelineDrawer.tsx` — Detailed timeline drawer

## Callbacks

- `onTimeRangeChange` — Change time range
- `onCompareToggle` — Toggle comparison mode
- `onCustomDateRangeSelect` — Select custom date range
- `onFilterRecords` — Filter cancellation records
- `onSearchRecords` — Search cancellation records
- `onViewRecordDetails` — View detailed timeline
- `onFilterActivityLogs` — Filter activity logs
- `onExportReport` — Export report

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


