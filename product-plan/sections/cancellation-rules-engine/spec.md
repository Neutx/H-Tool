# Cancellation Rules Engine Specification

## Overview
The Cancellation Rules Engine allows merchants to configure automation rules that determine how cancellation requests are handled. Merchants can activate pre-built rule templates, customize conditions and actions, and manage a manual review queue for flagged orders that require human decision-making.

## User Flows
- **View Rules Dashboard** — Merchant sees all rules with status, conditions, actions, priority, usage stats, and last modified date
- **Activate Rule Template** — Merchant selects from pre-built templates (e.g., "Auto-approve within 15 min", "Flag high-risk orders") and customizes conditions/actions
- **Edit Existing Rule** — Merchant modifies conditions (time windows, risk levels, order status) or actions (auto-approve, escalate, deny)
- **Toggle Rule Status** — Merchant activates or deactivates rules without deleting them
- **Manage Rule Priority** — Merchant reorders rules to determine which applies when multiple match
- **Review Flagged Orders** — Merchant views manual review queue with order details, cancellation reason, and risk indicators
- **Approve/Deny Cancellation** — Merchant makes decision on flagged orders from the review queue
- **Request Customer Information** — Merchant asks for additional details before deciding
- **Escalate to Team** — Merchant forwards order to another team member or support
- **Add Audit Notes** — Merchant adds internal notes explaining their decision for compliance

## UI Requirements
- **Rules Dashboard** — Table/card view showing all rules with: name, active/inactive status badge, condition summary, action label, priority number, usage count, last modified date
- **Pre-built Templates Library** — Modal or side panel with template cards: "Auto-approve within 15 min", "Flag high-risk orders", "Escalate after 24 hours", "Deny if already fulfilled"
- **Rule Customization Form** — Edit template with dropdowns for: time window (15 min/1 hr/24 hrs), user type (customer/merchant/system), risk level (low/medium/high), order status, fulfillment status, payment status
- **Action Selection** — Radio buttons or dropdown for: Auto-approve, Escalate to support, Flag for manual review, Deny
- **Manual Review Queue** — Table showing: Order #, Customer name, Request time, Reason, Risk level badge, Order total, Time elapsed
- **Order Detail Panel** — Slide-over or modal with: Full order details, cancellation request info, customer history, risk indicators, action buttons (Approve/Deny/Request Info/Escalate), notes field
- **Usage Analytics** — Per-rule stats showing how many times triggered (today/this week/total)
- **Filters & Search** — Filter rules by status (active/inactive) and search by name/condition

## Configuration
- shell: true

