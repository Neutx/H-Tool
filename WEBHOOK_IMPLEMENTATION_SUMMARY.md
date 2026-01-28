# Webhook Implementation Summary (Shopify)

## Architecture Overview

This webhook system uses a 3-tier flow:

**Shopify Store → Webhook Endpoints (Next.js routes) → Database (Prisma) + processing logic**

---

## 1) Webhook Registration (how they connect to Shopify)

**Primary location**: `app/actions/shopify-webhooks.ts`  
**Shopify API client**: `lib/shopify.ts`

### Required webhook topics

- `orders/create`
- `orders/updated`
- `orders/cancelled`
- `refunds/create`

### Webhook URLs (your app endpoints)

Mapped in `getWebhookUrl()`:

- `orders/create` → `/api/webhooks/shopify/orders-create`
- `orders/updated` → `/api/webhooks/shopify/orders-updated`
- `orders/cancelled` → `/api/webhooks/shopify/orders-cancelled`
- `refunds/create` → `/api/webhooks/shopify/refunds-create`

The base URL comes from:

- `NEXT_PUBLIC_APP_URL` (preferred)
- fallback: `http://localhost:3000`

### Who registers webhooks on Shopify’s end?

Your app registers webhooks using the **Shopify Admin REST API** via `ShopifyClient` in `lib/shopify.ts`:

- Create: `POST /admin/api/{version}/webhooks.json`
- List: `GET /admin/api/{version}/webhooks.json`
- Delete: `DELETE /admin/api/{version}/webhooks/{id}.json`

The call that creates a webhook is `shopify.registerWebhook(topic, address)`, which posts:

```json
{
  "webhook": {
    "topic": "orders/create",
    "address": "https://your-app.com/api/webhooks/shopify/orders-create",
    "format": "json"
  }
}
```

The Shopify API returns a webhook object that includes an `id`. Your app stores that ID in the database as a **string** in `ShopifyWebhook.shopifyWebhookId`.

### Registration behaviors

There are two server actions:

1. **Single registration**: `registerSingleWebhook(organizationId, topic)`
   - Checks DB for an existing record for that `(organizationId, topic)`
   - Attempts to delete the old webhook from Shopify (best-effort)
   - Deletes the DB record
   - Lists webhooks from Shopify to detect if the same `(topic + address)` already exists
     - If found: saves it into DB (avoids “address: has already been taken”)
     - If not found: creates a new webhook on Shopify, then saves into DB

2. **Bulk registration**: `registerShopifyWebhooks(organizationId)`
   - Registers the required topics in a loop
   - Uses similar “delete old then register” behavior per topic

---

## 2) Verification & Security (HMAC)

**Location**: `lib/shopify-webhook-utils.ts`

Incoming webhook requests are verified using the `X-Shopify-Hmac-Sha256` header and your configured secret:

- Env var: `SHOPIFY_WEBHOOK_SECRET`

Verification flow:

1. Read raw request body as text (must be raw, not pre-parsed).
2. Compute HMAC SHA-256 base64 with the secret.
3. Compare with Shopify’s header using a timing-safe comparison.
4. If invalid → respond `401` (`respondToWebhookError("Invalid webhook signature", 401)`).

If `SHOPIFY_WEBHOOK_SECRET` is missing, verification is **skipped** (allowed for dev).

---

## 3) Incoming events processing flow (end-to-end)

Each webhook route follows the same pattern:

1. **Parse + verify** payload via `parseWebhookPayload()`
2. **Identify shop domain**:
   - Header: `X-Shopify-Shop-Domain`
   - Fallback: `payload.shop_domain`
3. **Resolve organization**:
   - Looks up `Organization` via `shopifyStoreUrl` matching the shop domain (normalized)
4. **Update webhook health fields**:
   - `ShopifyWebhook.testStatus` (set to `success`)
   - `ShopifyWebhook.lastTestedAt` (set to now)
5. **Run business logic** (create/update orders, cancellations, refunds)
6. **Log the event**:
   - Insert a record into `WebhookEvent` with payload + headers + success/error
7. **Update last-triggered**:
   - `ShopifyWebhook.lastTriggeredAt` set to now
8. Return `200 OK` quickly (Shopify expects a response within ~5 seconds)

---

## 4) Database storage model

**Schema location**: `prisma/schema.prisma`

### `ShopifyWebhook` (registration + health)

Tracks the webhook registration info per organization/topic:

- `organizationId`
- `topic`
- `shopifyWebhookId` (Shopify ID, stored as string)
- `address` (your URL)
- `status`
- `lastTriggeredAt`
- `lastTestedAt`
- `testStatus`
- `lastTestResult`

Important constraints:

- `@@unique([organizationId, topic])`
- `shopifyWebhookId` is `@unique`

### `WebhookEvent` (audit log of all incoming events)

Stores every webhook payload for debugging/auditing:

- `organizationId`
- `topic`
- `shopifyWebhookId` (optional)
- `payload` (JSON)
- `headers` (optional JSON)
- `success` + `errorMessage`
- `processedAt`

This is also what powers the “has received data” indicator in the UI.

---

## 5) Post-verification: how data flows into your domain tables

### `orders/create`

**Route**: `app/api/webhooks/shopify/orders-create/route.ts`

Core behaviors:

- Extract numeric ID from Shopify “gid://…” format, then convert to `BigInt` for DB fields.
- Idempotency: if order exists (by `shopifyOrderId`) → skip.
- Customer handling:
  - Find by `shopifyCustomerId`
  - fallback: find by `email`
  - create if missing
- Line items:
  - Uses SKU to find internal `Product`
  - Skips items where product is missing
  - If no valid items remain → skips creating the order
- Creates:
  - `Order`
  - `LineItem` (nested create)
- Logs event in `WebhookEvent`
- Updates `ShopifyWebhook.lastTriggeredAt`

### `orders/updated`

**Route**: `app/api/webhooks/shopify/orders-updated/route.ts`

Core behaviors:

- Upsert-ish behavior:
  - If order exists → update order + sync line items
  - If not found → create a new order (similar to orders/create)
- Syncs line items:
  - Updates existing line items by `shopifyLineItemId`
  - Creates new line items if missing
  - Deletes DB line items removed from Shopify payload
- Updates customer link if changed
- Logs event in `WebhookEvent`
- Updates `ShopifyWebhook.lastTriggeredAt`

### `orders/cancelled`

**Route**: `app/api/webhooks/shopify/orders-cancelled/route.ts`

Core behaviors (high level):

- Verifies + resolves org
- Converts Shopify IDs correctly to `BigInt` where needed
- Updates order state / cancellation state
- Logs event in `WebhookEvent`
- Updates `ShopifyWebhook.lastTriggeredAt`

### `refunds/create`

**Route**: `app/api/webhooks/shopify/refunds-create/route.ts`

Core behaviors (high level):

- Verifies + resolves org
- Extracts numeric IDs and converts to `BigInt`
- Creates refund records / links to order
- Logs event in `WebhookEvent`
- Updates `ShopifyWebhook.lastTriggeredAt`

---

## 6) Testing the incoming event flow

There are two ways to test:

### A) UI “Test” button (Shopify’s webhook test endpoint)

**UI location**: `app/(dashboard)/admin/page.tsx`  
**Server action**: `triggerShopifyWebhookTest(webhookId, organizationId)` in `app/actions/shopify-webhooks.ts`  
**Shopify call**: `shopify.sendTestWebhook(shopifyWebhookId)` in `lib/shopify.ts`

Flow:

1. Click **Test**
2. Server action loads the DB record (`ShopifyWebhook`) and calls Shopify:
   - `POST /webhooks/{shopifyWebhookId}/test.json`
3. Shopify sends a test delivery to your webhook URL.
4. Your webhook handler processes it like a real event.

### B) Real Shopify actions (recommended for “Connected”)

Do the real action in Shopify:

- create an order → `orders/create`
- update an order → `orders/updated`
- cancel an order → `orders/cancelled`
- create a refund → `refunds/create`

These produce real deliveries with realistic payloads.

---

## 7) UI status: how “Waiting on data” vs “Connected” works

**UI location**: `app/(dashboard)/admin/page.tsx`

The UI computes:

- **Registered**: `webhook.isRegistered`
- **Has received data**: `webhook.hasReceivedData`

`hasReceivedData` is derived by checking whether **any `WebhookEvent` exists for that topic** for the organization (group-by count).

Status mapping:

- **Gray**: not registered
- **Orange**: registered, but no events recorded yet
- **Green**: registered, and at least one event recorded

---

## 8) Key environment variables

- `NEXT_PUBLIC_APP_URL` (your public base URL used to build webhook addresses)
- `SHOPIFY_STORE_URL`
- `SHOPIFY_ACCESS_TOKEN`
- `SHOPIFY_API_VERSION`
- `SHOPIFY_WEBHOOK_SECRET`

