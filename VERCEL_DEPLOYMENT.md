# Vercel Deployment Guide for Refunds Cron Job

## Overview
This guide will help you deploy the H-Tool application to Vercel and configure the refunds sync cron job to automatically fetch past refunds data.

## Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. GitHub repository with your code
3. All environment variables ready

## Step 1: Deploy to Vercel

1. **Connect your repository:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

2. **Configure build settings:**
   - Framework Preset: Next.js
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

## Step 2: Set Environment Variables in Vercel

Go to your project settings > Environment Variables and add the following:

### Required Environment Variables:

1. **Database:**
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.your-project.supabase.co:5432/postgres
   ```

2. **Supabase:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Firebase:**
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

4. **Shopify:**
   ```
   SHOPIFY_STORE_URL=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your-shopify-access-token
   SHOPIFY_API_VERSION=2026-01
   ```

5. **CRON_SECRET (IMPORTANT for cron job security):**
   ```
   CRON_SECRET=your-secure-random-secret-here
   ```
   
   **⚠️ IMPORTANT:** This secret is used to authenticate Vercel cron job requests. Keep it secure and don't share it publicly.

6. **App Config:**
   ```
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```

### Setting Environment Variables:
- Go to Project Settings > Environment Variables
- Add each variable for **Production**, **Preview**, and **Development** environments
- Click "Save" after adding each variable

## Step 3: Verify Cron Job Configuration

The cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync/refunds",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This will:
- Run daily at 2:00 AM UTC
- Call `/api/sync/refunds` endpoint
- Automatically send `Authorization: Bearer <CRON_SECRET>` header

## Step 4: Deploy and Verify

1. **Deploy the application:**
   - Push your code to GitHub
   - Vercel will automatically deploy
   - Or manually trigger deployment from Vercel dashboard

2. **Verify cron job is registered:**
   - Go to Project Settings > Cron Jobs
   - You should see "Sync Refunds" scheduled for "0 2 * * *"
   - Status should be "Active"

3. **Test the cron endpoint manually:**
   ```bash
   curl -X GET https://your-app.vercel.app/api/sync/refunds \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "message": "Refunds synced successfully",
     "syncedCount": 0,
     "newCount": 0,
     "updatedCount": 0,
     "errors": []
   }
   ```

4. **Trigger manual sync from dashboard:**
   - Navigate to `/refunds` page
   - Click "Sync Recent Returns" button
   - This will fetch refunds from Shopify and populate the dashboard

## Step 5: Monitor Cron Job Execution

1. **Check Vercel logs:**
   - Go to Project > Deployments > Select latest deployment > Functions tab
   - Look for `/api/sync/refunds` function logs
   - Check for any errors or warnings

2. **Check refunds dashboard:**
   - After cron job runs, check `/refunds` page
   - Verify refunds are being synced and displayed

3. **Monitor cron job status:**
   - Go to Project Settings > Cron Jobs
   - View execution history and status

## Troubleshooting

### Cron job not running:
- Verify `CRON_SECRET` is set in Vercel environment variables
- Check that `vercel.json` is in the root directory
- Ensure the cron job path `/api/sync/refunds` exists
- Check Vercel logs for errors

### Refunds not syncing:
- Verify Shopify credentials are correct
- Check that Shopify store has refunds to sync
- Review API logs for Shopify API errors
- Ensure database connection is working

### Authorization errors:
- Verify `CRON_SECRET` matches in both `.env` and Vercel dashboard
- Check that Vercel is sending the Authorization header correctly
- Review the cron route code in `app/api/sync/refunds/route.ts`

## Next Steps

After deployment:
1. Wait for the first cron job execution (2 AM UTC)
2. Or manually trigger sync from the refunds dashboard
3. Verify refunds appear in the dashboard
4. Monitor for any errors in Vercel logs

## Additional Notes

- The cron job syncs up to 50 refunds per execution
- Refunds are fetched from the last 100 orders in Shopify
- The sync creates orders and customers if they don't exist
- Duplicate refunds are updated, not duplicated
- Manual sync is available via the "Sync Recent Returns" button
