# Milestone 2: Cancellation Rules Engine

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

---

## About These Instructions

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Data model definitions (TypeScript types and sample data)
- UI/UX specifications (user flows, requirements, screenshots)
- Design system tokens (colors, typography, spacing)
- Test-writing instructions for each section (for TDD approach)

**What you need to build:**
- Backend API endpoints and database schema
- Authentication and authorization
- Data fetching and state management
- Business logic and validation
- Integration of the provided UI components with real data

**Important guidelines:**
- **DO NOT** redesign or restyle the provided components — use them as-is
- **DO** wire up the callback props to your routing and API calls
- **DO** replace sample data with real data from your backend
- **DO** implement proper error handling and loading states
- **DO** implement empty states when no records exist (first-time users, after deletions)
- **DO** use test-driven development — write tests first using `tests.md` instructions
- The components are props-based and ready to integrate — focus on the backend and data layer

---

## Goal

Implement the Cancellation Rules Engine feature — the intelligent automation core that validates cancellation requests and determines approval routing.

## Overview

The Cancellation Rules Engine allows merchants to configure automation rules that determine how cancellation requests are handled. Merchants can activate pre-built rule templates, customize conditions and actions, and manage a manual review queue for flagged orders that require human decision-making.

**Key Functionality:**
- View all automation rules with status, conditions, actions, priority, and usage stats
- Activate pre-built rule templates (e.g., "Auto-approve within 15 min", "Flag high-risk orders")
- Edit existing rules to modify conditions (time windows, risk levels, order status) or actions
- Toggle rule status (activate/deactivate) without deleting
- Manage rule priority to determine which applies when multiple match
- Review flagged orders in manual review queue with order details and risk indicators
- Approve/deny cancellations from the review queue
- Request additional customer information before deciding
- Escalate orders to team members or support
- Add audit notes explaining decisions for compliance

## Recommended Approach: Test-Driven Development

Before implementing this section, **write tests first** based on the test specifications provided.

See `product-plan/sections/cancellation-rules-engine/tests.md` for detailed test-writing instructions including:
- Key user flows to test (success and failure paths)
- Specific UI elements, button labels, and interactions to verify
- Expected behaviors and assertions

The test instructions are framework-agnostic — adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, RSpec, Minitest, PHPUnit, etc.).

**TDD Workflow:**
1. Read `tests.md` and write failing tests for the key user flows
2. Implement the feature to make tests pass
3. Refactor while keeping tests green

## What to Implement

### Components

Copy the section components from `product-plan/sections/cancellation-rules-engine/components/`:

- `RulesDashboard.tsx` — Main dashboard showing all rules
- `ReviewQueue.tsx` — Manual review queue for flagged orders
- `index.ts` — Component exports

### Data Layer

The components expect these data shapes:

- `Rule` — Automation rule with conditions, actions, priority, status
- `RuleTemplate` — Pre-built rule template
- `ReviewQueueItem` — Order flagged for manual review

You'll need to:
- Create API endpoints for rules CRUD operations
- Create API endpoints for review queue operations
- Connect real data to the components

### Callbacks

Wire up these user actions:

- `onCreateRule` — Called when user wants to create a new rule
- `onEditRule` — Called when user wants to edit a rule
- `onDeleteRule` — Called when user wants to delete a rule
- `onToggleRuleStatus` — Called when user toggles rule active/inactive
- `onReorderRules` — Called when user changes rule priority order
- `onActivateTemplate` — Called when user activates a rule template
- `onFilterRules` — Called when user filters rules by status
- `onSearchRules` — Called when user searches rules
- `onApproveCancellation` — Called when merchant approves a cancellation from review queue
- `onDenyCancellation` — Called when merchant denies a cancellation from review queue
- `onRequestInfo` — Called when merchant requests additional customer information
- `onEscalate` — Called when merchant escalates order to team/support
- `onAddNotes` — Called when merchant adds audit notes

### Empty States

Implement empty state UI for when no records exist yet:

- **No rules yet:** Show a helpful message and call-to-action when the rules list is empty
- **No review queue items:** Handle cases where the review queue is empty
- **First-time user experience:** Guide users to create their first rule with clear CTAs

The provided components include empty state designs — make sure to render them when data is empty rather than showing blank screens.

## Files to Reference

- `product-plan/sections/cancellation-rules-engine/README.md` — Feature overview and design intent
- `product-plan/sections/cancellation-rules-engine/tests.md` — Test-writing instructions (use for TDD)
- `product-plan/sections/cancellation-rules-engine/components/` — React components
- `product-plan/sections/cancellation-rules-engine/types.ts` — TypeScript interfaces
- `product-plan/sections/cancellation-rules-engine/sample-data.json` — Test data

## Expected User Flows

When fully implemented, users should be able to complete these flows:

### Flow 1: Create a New Rule from Template

1. User clicks "New Rule" or "Activate Template" button
2. User selects a pre-built template (e.g., "Auto-approve within 15 min")
3. User customizes conditions (time window, risk level, order status) and actions
4. User clicks "Save" to create the rule
5. **Outcome:** New rule appears in the rules list, active and ready to use

### Flow 2: Review and Approve Flagged Order

1. User navigates to Review Queue
2. User sees list of flagged orders with order details, risk indicators, and cancellation reasons
3. User clicks on an order to view full details
4. User reviews order information, customer history, and risk assessment
5. User clicks "Approve" to approve the cancellation
6. **Outcome:** Order is approved, removed from review queue, cancellation proceeds

### Flow 3: Edit Existing Rule

1. User clicks "Edit" on an existing rule
2. User modifies conditions or actions in the rule form
3. User clicks "Save" to update the rule
4. **Outcome:** Rule updates in place, changes persisted, usage stats preserved

## Done When

- [ ] Tests written for key user flows (success and failure paths)
- [ ] All tests pass
- [ ] Components render with real data
- [ ] Empty states display properly when no records exist
- [ ] All user actions work (create, edit, delete, toggle, reorder, activate template)
- [ ] Review queue displays flagged orders correctly
- [ ] Review queue actions work (approve, deny, request info, escalate, add notes)
- [ ] User can complete all expected flows end-to-end
- [ ] Matches the visual design
- [ ] Responsive on mobile


