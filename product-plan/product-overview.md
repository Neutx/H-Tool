# H-Tool — Product Overview

## Summary

H-Tool is a comprehensive merchant operations platform that automates and streamlines order cancellation management, refund processing, inventory control, and customer communications for Shopify merchants. It integrates with e-commerce platforms and inventory management systems to provide intelligent automation and real-time decision-making.

## Planned Sections

1. **Cancellation Rules Engine** — The intelligent automation core that validates cancellation requests and determines approval routing. Handles the complete validation pipeline: order existence, order status (open/pending), fulfillment status (unfulfilled/partial), payment status, time windows, and fraud detection. Routes requests to auto-approval, manual review, or rejection.

2. **Refund Management** — Processes the complete refund lifecycle via Shopify API with intelligent error handling. Supports full, partial, and no-refund scenarios with automatic calculation of taxes, shipping, and item-level amounts. Implements exponential backoff retry logic for payment processor failures (max 3 attempts: 1s, 2s, 4s, 8s).

3. **Inventory Control** — Automatically restocks canceled items to Shopify inventory with intelligent decision logic. Only restocks unfulfilled items with inventory management enabled. Updates product availability status (e.g., marks out-of-stock products as available). Creates permanent audit records for every inventory adjustment.

4. **Customer Portal** — Customer-facing self-service cancellation interface integrated with Sagepilot CRM and WhatsApp. Respects merchant-configured time windows (15 min auto-approve, 1 hour quick refund, 24 hours escalate, >24 hours deny). Sends automated email notifications with refund status, timeline (3-5 days), and restock confirmation.

5. **Analytics Dashboard** — Comprehensive analytics and audit trail system. Tracks every cancellation with permanent records (ID, order_id, customer_id, initiated_by, reason, refund_amount, timestamps). Provides real-time metrics on cancellation rates, reason breakdowns, refund success rates, and fraud patterns. Creates the "single source of truth" to eliminate data mismatches between warehouse, support, and original reports.

## Data Model

**Core Entities:**
- Order — Customer orders from Shopify with full details
- LineItem — Individual products within orders
- Customer — Customer information and order history
- CancellationRequest — Requests to cancel orders
- CancellationRecord — Permanent audit trail of cancellations
- RefundTransaction — Refund transactions processed through Shopify
- InventoryAdjustment — Changes to product inventory levels
- Product — Products in the merchant's catalog
- Rule — Automation rules in the Cancellation Rules Engine
- RuleTemplate — Pre-built rule templates
- ReviewQueueItem — Orders flagged for manual review
- ProductRestockRule — Per-product restock configuration
- FailedSync — Failed synchronization attempts
- Integration — External system connections
- IntegrationSync — Synchronization events
- OrderStatusUpdate — Real-time order status updates

**Key Relationships:**
- Order has many LineItems
- Order belongs to Customer
- CancellationRequest references one Order
- CancellationRecord is created from one CancellationRequest
- RefundTransaction is created for one CancellationRecord
- InventoryAdjustment references one Product and optionally one Order

See `data-model/README.md` for complete entity definitions and relationships.

## Design System

**Colors:**
- Primary: emerald — Used for buttons, links, key accents, success states
- Secondary: amber — Used for tags, highlights, secondary elements, warnings
- Neutral: slate — Used for backgrounds, text, borders

**Typography:**
- Heading: Inter — Used for all headings
- Body: Inter — Used for body text
- Mono: JetBrains Mono — Used for code and technical content

See `design-system/` for complete token definitions and configuration.

## Implementation Sequence

Build this product in milestones:

1. **Foundation** — Set up design tokens, data model types, routing structure, and application shell
2. **Cancellation Rules Engine** — Intelligent automation core for validation and routing
3. **Refund Management** — Complete refund lifecycle processing with retry logic
4. **Inventory Control** — Automatic and manual restocking with audit trails
5. **Customer Portal** — Customer-facing self-service cancellation interface
6. **Analytics Dashboard** — Comprehensive analytics and audit trail system

Each milestone has a dedicated instruction document in `product-plan/instructions/`.


