# Webhook Testing Guide

## Setup

### 1. Apply Database Migration
First, restart the dev server and apply the schema changes:

```bash
# Stop the dev server (Ctrl+C in terminal)
npx prisma generate
npx prisma db push
# Restart dev server
npm run dev
```

### 2. Register Webhooks
1. Go to Admin Panel → Integrations
2. Expand the Shopify card
3. Click "Register All Webhooks"
4. Verify all 4 webhooks are registered:
   - orders/create
   - orders/update
   - orders/cancelled
   - refunds/create

## Test Each Webhook

### Test 1: orders/create
**Payload Sample:**
```json
{
  "id": "5678901234567",
  "name": "#TEST001",
  "order_number": 1001,
  "status": "open",
  "financial_status": "paid",
  "fulfillment_status": "unfulfilled",
  "total_price": "99.99",
  "currency": "USD",
  "created_at": "2026-01-27T10:00:00Z",
  "customer": {
    "id": "7890123456789",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "Customer",
    "phone": "+1234567890"
  },
  "line_items": [
    {
      "id": "9876543210987",
      "sku": "TSHIRT-BLU-M",
      "title": "Blue T-Shirt - Medium",
      "quantity": 1,
      "price": "99.99",
      "tax_lines": [
        {
          "price": "9.99",
          "rate": 0.1,
          "title": "VAT"
        }
      ]
    }
  ],
  "shipping_address": {
    "name": "Test Customer",
    "address1": "123 Test St",
    "city": "Test City",
    "province": "Test State",
    "zip": "12345",
    "country": "US"
  }
}
```

**Expected Result:**
- ✅ New order created in database
- ✅ Customer created (if doesn't exist) or linked
- ✅ Line items created and linked to products
- ✅ Webhook event logged
- ✅ Test status updated to "success"
- ✅ Green dot appears in UI

**Verify:**
```sql
-- Check order was created
SELECT * FROM orders WHERE "shopifyOrderId" = 5678901234567;

-- Check customer was created
SELECT * FROM customers WHERE "shopifyCustomerId" = '7890123456789';

-- Check line items
SELECT * FROM line_items WHERE "orderId" = (SELECT id FROM orders WHERE "shopifyOrderId" = 5678901234567);

-- Check webhook event logged
SELECT * FROM webhook_events WHERE topic = 'orders/create' ORDER BY "createdAt" DESC LIMIT 1;

-- Check webhook test status
SELECT "testStatus", "lastTestedAt" FROM shopify_webhooks WHERE topic = 'orders/create';
```

### Test 2: orders/update (Updating Existing Order)
**Payload Sample:**
```json
{
  "id": "5678901234567",
  "name": "#TEST001",
  "order_number": 1001,
  "status": "open",
  "financial_status": "paid",
  "fulfillment_status": "fulfilled",
  "total_price": "99.99",
  "currency": "USD",
  "created_at": "2026-01-27T10:00:00Z",
  "customer": {
    "id": "7890123456789",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "Customer"
  },
  "line_items": [
    {
      "id": "9876543210987",
      "sku": "TSHIRT-BLU-M",
      "title": "Blue T-Shirt - Medium",
      "quantity": 1,
      "price": "99.99"
    }
  ]
}
```

**Expected Result:**
- ✅ Order updated (fulfillmentStatus changed to "fulfilled")
- ✅ Webhook event logged
- ✅ Test status updated

**Verify:**
```sql
SELECT "fulfillmentStatus" FROM orders WHERE "shopifyOrderId" = 5678901234567;
-- Should show: fulfilled
```

### Test 3: orders/update (Creating Missing Order)
**Payload Sample:**
```json
{
  "id": "1111222233334444",
  "name": "#TEST002",
  "order_number": 1002,
  "status": "open",
  "financial_status": "pending",
  "fulfillment_status": "unfulfilled",
  "total_price": "149.99",
  "currency": "USD",
  "created_at": "2026-01-27T11:00:00Z",
  "customer": {
    "id": "9999888877776666",
    "email": "newcustomer@example.com",
    "first_name": "New",
    "last_name": "Customer"
  },
  "line_items": [
    {
      "id": "5555666677778888",
      "sku": "JEANS-BLK-32",
      "title": "Black Jeans - 32",
      "quantity": 1,
      "price": "149.99"
    }
  ]
}
```

**Expected Result:**
- ✅ New order created (via orders/update)
- ✅ New customer created
- ✅ Line items created
- ✅ Webhook event logged

**Verify:**
```sql
SELECT * FROM orders WHERE "shopifyOrderId" = 1111222233334444;
SELECT * FROM webhook_events WHERE topic = 'orders/update' ORDER BY "createdAt" DESC LIMIT 1;
```

### Test 4: orders/cancelled
**Payload Sample:**
```json
{
  "id": "5678901234567",
  "name": "#TEST001",
  "cancelled_at": "2026-01-27T12:00:00Z",
  "cancel_reason": "customer"
}
```

**Expected Result:**
- ✅ Order updated with cancelled status
- ✅ ShopifyCancellation record created
- ✅ Webhook event logged

**Verify:**
```sql
SELECT "cancelledAt", "cancelReason" FROM orders WHERE "shopifyOrderId" = 5678901234567;
SELECT * FROM shopify_cancellations WHERE "shopifyOrderId" = 5678901234567;
SELECT * FROM webhook_events WHERE topic = 'orders/cancelled' ORDER BY "createdAt" DESC LIMIT 1;
```

### Test 5: refunds/create
**Prerequisites:**
- Order must exist (create using orders/create first)

**Payload Sample:**
```json
{
  "id": "9999888877776666",
  "order_id": "5678901234567",
  "created_at": "2026-01-27T13:00:00Z",
  "note": "Customer requested refund",
  "transactions": [
    {
      "id": "1234567890123",
      "status": "success",
      "amount": "99.99",
      "gateway": "shopify_payments",
      "processed_at": "2026-01-27T13:00:05Z"
    }
  ],
  "refund_line_items": [
    {
      "line_item_id": "9876543210987",
      "quantity": 1,
      "restock_type": "no_restock"
    }
  ]
}
```

**Expected Result:**
- ✅ Refund transaction created
- ✅ Cancellation request/record created (if needed)
- ✅ Webhook event logged

**Verify:**
```sql
SELECT * FROM refund_transactions WHERE "shopifyRefundId" = 9999888877776666;
SELECT * FROM webhook_events WHERE topic = 'refunds/create' ORDER BY "createdAt" DESC LIMIT 1;
```

## Testing via Shopify Admin Panel

### Manual Testing (Recommended)
1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Find the webhook you want to test
3. Click "Send test notification"
4. Check the webhook events table and UI status indicators

### Automatic Testing (via UI)
1. Go to Admin Panel → Integrations → Expand Shopify
2. Click "Test" button next to any webhook
3. Wait 2-3 seconds for test to complete
4. Green dot should appear if successful

## UI Status Indicators

### Green Dot
- Webhook has `testStatus === "success"`
- AND `lastTestedAt` is within last 24 hours
- Tooltip: "Connected & Verified (tested within 24h)"

### Red Dot
- Webhook not tested OR test failed OR test older than 24 hours
- Tooltip: "Connection Needed / Not Tested / Test Expired"

## Webhook Event Logs

All webhook events are stored in `webhook_events` table:

```sql
-- View recent webhook events
SELECT 
  topic,
  success,
  "errorMessage",
  "processedAt"
FROM webhook_events
ORDER BY "createdAt" DESC
LIMIT 20;

-- Count events by topic
SELECT 
  topic,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed
FROM webhook_events
GROUP BY topic;
```

## Troubleshooting

### Error: "Property 'webhookEvent' does not exist"
**Solution:** Regenerate Prisma client
```bash
npx prisma generate
```

### Error: "testStatus does not exist in type"
**Solution:** Restart dev server after running `prisma generate`

### Webhook not receiving data
1. Check webhook is registered in Shopify Admin
2. Verify webhook URL is publicly accessible (use ngrok for local testing)
3. Check SHOPIFY_WEBHOOK_SECRET is configured
4. Check webhook_events table for error messages

### Green dot not appearing
1. Click "Test" button or send test webhook from Shopify
2. Wait 2-3 seconds for status to update
3. Click "Sync Status" to refresh
4. Check `lastTestedAt` and `testStatus` in database

## Next Steps

After testing:
1. Verify all webhooks show green dots
2. Monitor webhook_events table for any errors
3. Set up alerts for failed webhooks
4. Consider adding a webhook events viewer in admin panel
