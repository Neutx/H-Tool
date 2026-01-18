# Data Model

This document describes the core entities and relationships in H-Tool.

## Entities

### Order
Represents a customer order from Shopify. Contains order details like order number, status, fulfillment status, payment status, total amount, customer information, and line items. Orders are the primary entity that cancellation requests operate on.

### LineItem
Represents an individual product item within an order. Contains product information like SKU, title, quantity, price, and inventory management settings. Line items determine which products can be restocked when an order is canceled.

### Customer
Represents a customer who places orders. Contains customer information like email, phone number, name, and customer ID from Shopify. Customers can initiate cancellation requests through the customer portal.

### CancellationRequest
Represents a request to cancel an order, initiated by a customer, merchant, or system. Contains the order reference, reason for cancellation, user type (customer/merchant/system), refund preferences, and optional notes. This is the input that triggers the cancellation workflow.

### CancellationRecord
Represents a permanent audit trail record of a completed or failed cancellation. Contains all cancellation details including who initiated it, when, the reason, refund amount, refund status, restock decision, and completion timestamp. This creates the "single source of truth" for all cancellations.

### RefundTransaction
Represents a refund transaction processed through Shopify's payment system. Contains transaction ID, refund amount, status (pending/completed/failed), payment processor information, retry attempts, and timestamps. Tracks the complete refund lifecycle including retry logic.

### InventoryAdjustment
Represents a change to product inventory levels, typically triggered by order cancellations. Contains product reference, quantity change (positive for restocks, negative for removals), reason, timestamp, and who made the adjustment. Creates a complete audit trail of all inventory changes.

### Product
Represents a product in the merchant's catalog. Contains product information like name, SKU, current stock level, availability status, and inventory management settings. Products can have restock rules that determine whether they should be automatically restocked when orders are canceled.

### Rule
Represents an automation rule in the Cancellation Rules Engine. Contains rule conditions (time windows, order status, fulfillment status, risk levels), actions (auto-approve, manual review, reject), priority, and active status. Rules determine how cancellation requests are automatically processed.

### RuleTemplate
Represents a pre-built rule template that merchants can activate and customize. Contains common rule configurations like "Cancel within 15 min", "Cancel if payment declined", or "Cancel if out of stock". Templates provide quick setup for common scenarios.

### ReviewQueueItem
Represents an order that has been flagged for manual review by the merchant. Contains order details, risk assessment, cancellation reason, customer history, and review status. Items in the queue require merchant decision before proceeding.

### ProductRestockRule
Represents a per-product configuration that determines whether a product should be automatically restocked when orders are canceled. Contains product reference, "never auto-restock" toggle, and reason for the rule. Allows merchants to exclude specific products from automatic restocking.

### FailedSync
Represents a failed synchronization attempt with external systems like Unicommerce. Contains product reference, error message, error code, timestamp, retry count, and status. Tracks sync failures that need manual intervention or retry.

### Integration
Represents a connection to an external system (Shopify, Sagepilot CRM, Unicommerce, courier partners). Contains integration type, credentials, configuration, and sync status. Manages all external system connections.

### IntegrationSync
Represents a synchronization event between H-Tool and an external system. Contains integration reference, sync type (order status, inventory, customer data), timestamp, status (success/failed), and any error information. Tracks all data synchronization activities.

### OrderStatusUpdate
Represents a real-time update about an order's status from external systems like courier partners (Delhivery, Bluedart). Contains order reference, status information, tracking details, and timestamp. Enables real-time order tracking integration.

## Relationships

- Order has many LineItems
- Order belongs to Customer
- CancellationRequest references one Order
- CancellationRequest can be initiated by Customer, Merchant, or System
- CancellationRecord is created from one CancellationRequest
- CancellationRecord references one Order and one Customer
- RefundTransaction is created for one CancellationRecord
- RefundTransaction references one Order
- InventoryAdjustment references one Product and optionally one Order
- Product can have one ProductRestockRule
- Rule can be created from a RuleTemplate
- ReviewQueueItem references one Order and one CancellationRequest
- FailedSync references one Product and one Integration
- Integration has many IntegrationSyncs
- IntegrationSync references one Integration
- OrderStatusUpdate references one Order and one Integration


