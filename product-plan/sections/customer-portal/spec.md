# Customer Portal Specification

## Overview
Customer-facing self-service cancellation portal with phone number OTP authentication. Customers can view their order history, request cancellations with time-window validation, track cancellation status in real time, and view their cancellation history. Integrated with Sagepilot CRM and WhatsApp for notifications.

## User Flows
- Phone number + OTP authentication → View order history
- Select order → View full order details (items, amounts, order date, shipping address)
- Request cancellation → Select reason + optional notes → Submit request
- View cancellation status → Real-time updates (pending → processing → completed) + estimated refund timeline
- View cancellation history → List of past cancellations with dates, reasons, refund amounts, statuses
- Time window exceeded → Show manual review request form (for orders >24 hours)
- Status change notifications → In-app alerts + email/WhatsApp notifications

## UI Requirements
- Phone number input + OTP verification screen
- Order history list view (after authentication)
- Order details view (full order info: items, quantities, prices, order date, shipping address)
- Cancellation request form (reason dropdown + optional notes/description field)
- Cancellation status tracking view (real-time status updates with visual timeline: pending → processing → completed)
- Estimated refund timeline display (e.g., "3-5 business days")
- Cancellation history list (past cancellations with dates, reasons, refund amounts, statuses)
- Manual review request form (for orders outside time window)
- In-app notification system (alerts/badges for status changes)
- Responsive design (mobile-first, works on all screen sizes)

## Configuration
- shell: false



