# Analytics Dashboard Specification

## Overview
The Analytics Dashboard provides a single source of truth for all cancellation data. It displays real-time metrics, trends, and comprehensive audit trails. Merchants can view cancellation rates, refund success rates, reason breakdowns, fraud patterns, and drill down into detailed step-by-step cancellation records.

## User Flows
- View metrics dashboard with key KPIs (cancellation rate, refund success rate, total cancellations)
- Filter metrics by time range (L7D, L14D, L30D, L90D, or custom date range) with optional comparison to previous period
- View charts showing trends over time and reason breakdowns
- View fraud pattern alerts showing rejected cancellation requests
- Filter and search cancellation records by status, reason, customer, date range, refund status, and fraud risk level
- Drill down into individual cancellation records to see complete timeline from customer request through entire process (line-by-line activity log)
- View activity logs showing all events (cancellation requests, approvals, rejections, refunds, system actions, manual actions)
- Export reports

## UI Requirements
- Single scrollable dashboard with different sections (similar to Inventory Control layout)
- Metrics section at top with key KPIs and time range selector (L7D, L14D, L30D, L90D, custom range) with checkbox to enable comparison mode
- Charts section showing trends over time and reason breakdowns
- Fraud alerts section showing rejected cancellation requests
- Cancellation records table with comprehensive filtering (status, reason, customer, date range, refund status, fraud risk level) and search
- Activity logs section showing all events chronologically
- Clickable cancellation records that open detailed view showing complete step-by-step timeline from request initiation through completion
- Export functionality for reports

## Configuration
- shell: true


