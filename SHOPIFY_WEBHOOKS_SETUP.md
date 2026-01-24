# Shopify Webhooks Setup Guide

This guide explains how to set up Shopify webhooks for real-time data synchronization.

## Overview

Webhooks allow Shopify to push data to your application in real-time when events occur (cancellations, returns, refunds). This eliminates the need for polling and provides instant updates.

## Prerequisites

1. Shopify store with API access configured
2. `SHOPIFY_ACCESS_TOKEN` and `SHOPIFY_STORE_URL` set in environment variables
3. Application deployed to a publicly accessible URL (for webhook endpoints)

## Step 1: Configure Environment Variables

### Required Variables

Add to your `.env.local` (development) or Vercel environment variables (production):

```bash
SHOPIFY_ACCESS_TOKEN="your_shopify_access_token"
SHOPIFY_STORE_URL="your-store.myshopify.com"
SHOPIFY_API_VERSION="2026-01"
SHOPIFY_WEBHOOK_SECRET=""  # Will be set after webhook registration
```

## Step 2: Register Webhooks via Admin Panel

1. **Navigate to Admin Panel**
   - Go to `/admin` in your application
   - Click on the **"Webhooks"** tab

2. **Register Webhooks**
   - Click **"Register All Webhooks"** button
   - This will create 4 webhooks in Shopify:
     - `orders/cancelled` - When an order is cancelled
     - `returns/create` - When a return is created
     - `returns/update` - When a return status is updated
     - `refunds/create` - When a refund is created

3. **Verify Registration**
   - All 4 webhooks should show as **"Active"** status
   - Webhook URLs will be displayed

## Step 3: Get Webhook Signing Secret

After registering webhooks:

1. **Go to Shopify Admin**
   - Navigate to: **Settings → Notifications → Webhooks**

2. **Find Your Webhook**
   - Look for one of the registered webhooks
   - Click on it to view details

3. **Copy Signing Secret**
   - The webhook signing secret is displayed in the webhook details
   - Copy this value

4. **Add to Environment Variables**
   ```bash
   SHOPIFY_WEBHOOK_SECRET="your_webhook_signing_secret_here"
   ```

5. **Redeploy Application**
   - If using Vercel, update the environment variable and redeploy
   - The webhook handlers will now verify HMAC signatures

## Step 4: Test Webhooks

### Test Cancellation Webhook

1. In Shopify Admin, cancel a test order
2. Check your application logs for webhook receipt
3. Verify the cancellation appears in your database

### Test Return Webhook

1. In Shopify Admin, create a return for a test order
2. Check application logs
3. Verify the return appears in your database

### Test Refund Webhook

1. In Shopify Admin, create a refund for a test order
2. Check application logs
3. Verify the refund appears in your database

## Webhook Endpoints

Your webhook endpoints are:

- **Cancellations**: `https://your-app.vercel.app/api/webhooks/shopify/orders-cancelled`
- **Returns (Create)**: `https://your-app.vercel.app/api/webhooks/shopify/returns-create`
- **Returns (Update)**: `https://your-app.vercel.app/api/webhooks/shopify/returns-update`
- **Refunds**: `https://your-app.vercel.app/api/webhooks/shopify/refunds-create`

## Troubleshooting

### Webhooks Not Receiving Events

1. **Check Webhook Status**
   - Go to Admin → Webhooks tab
   - Verify webhooks show as "Active"
   - Click "Sync Status" to refresh

2. **Verify Webhook URLs**
   - Ensure your app is publicly accessible
   - Check that URLs match your deployment domain

3. **Check Shopify Admin**
   - Go to Settings → Notifications → Webhooks
   - Verify webhooks are registered in Shopify
   - Check for any error messages

4. **Check Application Logs**
   - Look for webhook receipt logs
   - Check for HMAC verification errors
   - Verify database writes are successful

### HMAC Verification Failing

1. **Verify Secret is Set**
   - Check `SHOPIFY_WEBHOOK_SECRET` is set correctly
   - Ensure no extra spaces or quotes

2. **Check Secret Matches**
   - The secret in your env must match Shopify's webhook secret
   - Re-copy from Shopify if needed

3. **Development Mode**
   - In development, HMAC verification is optional if secret not set
   - In production, it's required for security

### Webhooks Receiving Duplicate Events

- This is normal - Shopify may send duplicate events
- Our handlers use idempotent upserts (unique constraints)
- Duplicates are automatically handled

## Manual Webhook Management

### Delete All Webhooks

1. Go to Admin → Webhooks tab
2. Click **"Delete All Webhooks"**
3. Confirm deletion
4. This removes webhooks from both Shopify and your database

### Delete Individual Webhook

1. Find the webhook in the list
2. Click the **X** button next to it
3. Confirm deletion

### Re-register Webhooks

If webhooks become inactive:

1. Click **"Register All Webhooks"** again
2. This will delete old webhooks and create new ones
3. Update `SHOPIFY_WEBHOOK_SECRET` if it changed

## Production Deployment

### Before Deploying

1. Ensure all environment variables are set in Vercel
2. Update `NEXT_PUBLIC_APP_URL` to your production domain
3. Register webhooks with production URLs

### After Deploying

1. Go to Admin → Webhooks tab
2. Click **"Register All Webhooks"** (this updates URLs)
3. Verify webhooks are active
4. Test with a real event

## Security Notes

- **HMAC Verification**: All webhook requests are verified using HMAC signatures
- **Idempotent Operations**: Upserts prevent duplicate data
- **Rate Limiting**: Webhook handlers respond within 5 seconds as required by Shopify
- **Error Handling**: Failed webhooks are logged but don't block Shopify

## Benefits

✅ **Real-time Updates**: Data appears instantly when events occur in Shopify
✅ **No Polling**: Eliminates need for frequent API calls
✅ **Efficient**: Only processes new events, not entire order history
✅ **Scalable**: Handles high event volumes without performance issues

## Next Steps

After webhooks are set up:

1. **Monitor Webhook Activity**
   - Check "Last Triggered" timestamps in Admin panel
   - Verify data appears in your dashboards

2. **Set Up Incremental Sync** (Backup)
   - Cron job runs daily as backup
   - Only syncs data since last sync (efficient)

3. **View Data**
   - Cancellations: Check cancellation records
   - Returns: Check returns dashboard
   - Refunds: Check refunds dashboard
