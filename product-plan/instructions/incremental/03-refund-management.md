# Milestone 3: Refund Management

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

[Include preamble from 02-cancellation-rules-engine.md]

## Goal

Implement the Refund Management feature — processes the complete refund lifecycle via Shopify API with intelligent error handling.

## Overview

The Refund Management section handles payment processing, refund transactions, and automatic retry logic for failed refunds. Merchants can view all refund transactions, process new refunds (full, partial, or none), and manually intervene when automated refunds fail.

**Key Functionality:**
- View all refund transactions with status, amounts, and payment processor info
- Process new refunds (full, partial, or no refund) with automatic calculation
- Search and filter refunds by status, date range, payment processor
- View refund details in drawer with complete transaction history
- Handle failed refunds with manual retry or adjustment
- Track refund metrics (success rate, total refunded, failed count)

## Components

- `RefundsDashboard.tsx` — Main dashboard with metrics and refunds table
- `RefundMetrics.tsx` — Key metrics display
- `ProcessRefundModal.tsx` — Multi-step refund processing modal
- `RefundDetailsDrawer.tsx` — Detailed refund information drawer

## Callbacks

- `onProcessRefund` — Process new refund
- `onViewDetails` — View refund details
- `onRetryRefund` — Retry failed refund
- `onFilterRefunds` — Filter refunds
- `onSearchRefunds` — Search refunds
- `onExportReport` — Export refund report

## Expected User Flows

### Flow 1: Process Full Refund
1. User clicks "Process Refund" on a canceled order
2. User selects "Full Refund" type
3. System calculates refund amount (items + tax + shipping)
4. User confirms and processes refund
5. **Outcome:** Refund processed successfully, status updated

### Flow 2: Retry Failed Refund
1. User views failed refund in dashboard
2. User clicks "Retry" on failed refund
3. System attempts refund with exponential backoff
4. **Outcome:** Refund succeeds or shows updated error

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


