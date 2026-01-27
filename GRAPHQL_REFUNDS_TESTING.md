# GraphQL Refunds Sync - Testing Guide

## Implementation Complete ✅

The GraphQL-based refund sync has been implemented. This guide helps you verify everything is working correctly.

## What Changed

1. **Added GraphQL method** (`lib/shopify.ts`)
   - New `graphql()` method for GraphQL queries
   - No external dependencies needed

2. **Replaced order-scanning with direct refund query** (`lib/shopify.ts`)
   - `getRefunds()` now uses GraphQL instead of scanning orders
   - Fetches up to 250 refunds directly (not limited by order count)
   - True incremental sync with `created_at` filter

3. **Webhook handler verified** (`app/api/webhooks/shopify/refunds-create/route.ts`)
   - Already correctly implemented
   - Handles real-time refund creation

## Testing Checklist

### Phase 1: Verify Webhook Registration (5 min)

1. **Check Shopify Admin**:
   - Go to: Shopify Admin → Settings → Notifications → Webhooks
   - Look for `refunds/create` webhook
   - URL should be: `https://your-domain.com/api/webhooks/shopify/refunds-create`
   - Status should be "Active"

2. **If webhook doesn't exist**:
   - Click "Create webhook"
   - Event: `refunds/create`
   - Format: `JSON`
   - URL: `https://your-domain.com/api/webhooks/shopify/refunds-create`
   - Save

3. **Test webhook**:
   - Create a test refund in Shopify Admin (Orders → Select order → Refund)
   - Check your database within 5-10 seconds:
     ```sql
     SELECT * FROM "RefundTransaction" 
     WHERE "syncedFromShopify" = true 
     ORDER BY "shopifyCreatedAt" DESC 
     LIMIT 1;
     ```
   - Should see the new refund record
   - Check server logs for: `[Webhook] Processed refund creation for refund...`

### Phase 2: Test GraphQL Sync (10 min)

1. **First Sync (Full Backfill)**:
   - Go to `/refunds` page in your app
   - Click "Sync Recent Returns" button
   - Open browser console (F12)
   - Look for diagnostics in console:
     - Should see: `[GraphQL] Fetched X refund(s) directly`
     - Should see: `[GraphQL] No filter (full sync)` or `[GraphQL] Filtered: created_at >= ...`
   - Check toast notification: Should show "Synced X refunds successfully!"
   - Verify in database:
     ```sql
     SELECT COUNT(*) FROM "RefundTransaction" WHERE "syncedFromShopify" = true;
     ```

2. **Verify Latest 50 Refunds**:
   - On `/refunds` page, check the refunds table
   - Should show 50 most recent refunds
   - Should include refunds from ALL orders (not just last 100 orders)
   - Order by `shopifyCreatedAt DESC` (most recent first)

3. **Check Diagnostics**:
   - In browser console, expand the diagnostics array
   - Should see:
     - `[Sync] Using incremental sync from...` or `[Sync] First sync - fetching all refunds`
     - `[GraphQL] Fetched X refund(s) directly`
     - `[Sync] Completed: X total, Y new, Z updated`

### Phase 3: Test Incremental Sync (10 min)

1. **Note Current Sync State**:
   - After first sync, note the `lastRefundSyncAt` timestamp:
     ```sql
     SELECT "lastRefundSyncAt" FROM "SyncState" WHERE "organizationId" = 'your-org-id';
     ```

2. **Create New Refund**:
   - Go to Shopify Admin
   - Create a refund for any order
   - Note the refund ID and timestamp

3. **Test Incremental Sync**:
   - Wait 1-2 minutes (or manually update `lastRefundSyncAt` to 1 hour ago)
   - Click "Sync Recent Returns" again
   - Check console diagnostics:
     - Should see: `[GraphQL] Filtered: created_at >= [timestamp]`
     - Should only fetch refunds created after the cursor
   - Verify only new refunds were added:
     ```sql
     SELECT COUNT(*) FROM "RefundTransaction" 
     WHERE "shopifyCreatedAt" > '[last-sync-timestamp]';
     ```

### Phase 4: Verify Performance (5 min)

1. **Check API Usage**:
   - Go to Shopify Admin → Apps → Your App
   - Check API usage/calls
   - GraphQL sync should use **1 API call** (vs 100+ before)
   - Webhook uses **0 API calls**

2. **Check Sync Speed**:
   - Full sync should complete in **2-3 seconds** (vs 30-60 seconds before)
   - Incremental sync should complete in **1-2 seconds**

3. **Check UI Performance**:
   - `/refunds` page should load instantly (< 100ms)
   - Reading from database, not API

## Expected Results

### ✅ Success Indicators

- **Latest 50 refunds show correctly** - Includes refunds from all orders, not just recent ones
- **Incremental sync works** - Only fetches new refunds after cursor
- **Webhook works** - Refunds appear in DB within seconds without sync
- **Fast sync** - 1 API call, completes in 2-3 seconds
- **No missed refunds** - All refunds are captured

### ❌ Failure Indicators (What to Watch For)

- **GraphQL errors in console** - Check error message, may need to verify API version
- **No refunds fetched** - Check if you have refunds in Shopify, verify API credentials
- **Webhook not receiving** - Check webhook registration, verify URL is accessible
- **Still missing refunds** - Check if refunds are older than your sync window

## Troubleshooting

### GraphQL Query Errors

**Error**: `Field 'refunds' doesn't exist on type 'QueryRoot'`

**Solution**: Your Shopify API version may not support refunds query. Check:
- Current API version in `lib/shopify.ts`: `SHOPIFY_API_VERSION`
- Shopify GraphQL API reference for your version
- May need to update to `2024-01` or later

**Error**: `Access denied for refunds field`

**Solution**: Check your Shopify app scopes:
- Required scopes: `read_orders`, `read_refunds`
- Update scopes in Shopify Partner Dashboard

### Webhook Not Working

**Issue**: Refunds not appearing via webhook

**Check**:
1. Webhook is registered in Shopify Admin
2. Webhook URL is accessible (not localhost in production)
3. Webhook signature verification is working
4. Check server logs for webhook errors

**Test**:
```bash
# Use Shopify CLI to test webhook
shopify webhook trigger --topic refunds/create
```

### Sync Not Working

**Issue**: Sync button doesn't fetch refunds

**Check**:
1. Browser console for errors
2. Server logs for API errors
3. Verify `SHOPIFY_STORE_URL` and `SHOPIFY_ACCESS_TOKEN` are set
4. Check network tab for GraphQL request/response

## Rollback Plan

If GraphQL has issues, you can quickly rollback:

1. **Edit `lib/shopify.ts`**:
   ```typescript
   async getRefunds(lastSyncAt?: Date, limit: number = 50) {
     // Quick rollback: Use old method
     return this.getRefundsIncremental(lastSyncAt, limit);
   }
   ```

2. **Old methods are still available**:
   - `getRefundsIncremental()` - Order-scanning method (backup)
   - `getRecentRefunds()` - Recent refunds method (backup)

## Next Steps

Once testing is complete and stable:

1. **Monitor for 1 week** - Ensure no issues
2. **Remove old methods** (optional) - Clean up `getRefundsIncremental()` and `getRecentRefunds()`
3. **Update documentation** - Document GraphQL approach for team
4. **Consider Returns** - Once refunds are stable, implement Returns GraphQL queries

## Support

If you encounter issues:
1. Check browser console (F12) for diagnostics
2. Check server logs for errors
3. Verify Shopify API credentials
4. Test GraphQL query directly in Shopify GraphQL Admin
