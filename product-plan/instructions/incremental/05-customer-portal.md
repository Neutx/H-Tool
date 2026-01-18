# Milestone 5: Customer Portal

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

[Include preamble from 02-cancellation-rules-engine.md]

## Goal

Implement the Customer Portal feature — customer-facing self-service cancellation interface with phone number OTP authentication.

## Overview

Customer-facing self-service cancellation portal with phone number OTP authentication. Customers can view their order history, request cancellations with time-window validation, track cancellation status in real time, and view their cancellation history. Integrated with Sagepilot CRM and WhatsApp for notifications.

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

- `onAuthenticate` — Authenticate with phone + OTP
- `onViewOrder` — View order details
- `onRequestCancellation` — Request cancellation
- `onViewCancellationHistory` — View past cancellations
- `onDismissNotification` — Dismiss notification

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


