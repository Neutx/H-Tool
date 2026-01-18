# Production Fix: Cancellation Rules Not Showing

## Problem
Cancellation rules were visible and working on localhost but appeared blank when deployed to Vercel.

## Root Cause
1. **Hardcoded Organization ID**: The code used a hardcoded `DEMO_ORG_ID = "cmkirf3lj0000jhhexsx6p1e3"` 
2. **Database Not Seeded**: Production database likely doesn't have the demo organization or rules
3. **No Error Handling**: Errors were silently swallowed, making debugging difficult

## Solution Implemented

### 1. Dynamic Organization ID Lookup
- Created `lib/get-org-id.ts` to automatically find or create the demo organization
- Created `app/actions/organization.ts` server action for client-side access
- Updated all cancellation rules code to use dynamic organization ID

### 2. Auto-Seed Endpoint
- Created `app/api/seed/route.ts` to seed the production database
- Automatically creates organization, rule templates, and initial rules
- Can be called via POST request: `POST /api/seed`

### 3. Auto-Seed on Page Load
- Updated `app/(dashboard)/cancellation-rules/page.tsx` to automatically seed if no rules found
- Better error logging to help debug issues

### 4. Improved Error Handling
- Added detailed error logging in `app/actions/rules.ts`
- Better error messages to identify issues

## How to Fix Production

### Option 1: Auto-Seed (Recommended)
The page will automatically seed the database when you visit `/cancellation-rules` if no rules are found.

### Option 2: Manual Seed via API
Call the seed endpoint manually:

```bash
curl -X POST https://your-app.vercel.app/api/seed
```

Or visit in browser:
```
https://your-app.vercel.app/api/seed
```

### Option 3: Seed via Vercel Function Logs
1. Go to Vercel Dashboard → Your Project → Functions
2. Find `/api/seed` function
3. Trigger it manually or check logs

## Verification

After seeding, check:
1. Visit `/cancellation-rules` page
2. Rules should appear automatically
3. Check browser console for any errors
4. Check Vercel function logs for seed operation

## Files Changed

- `lib/get-org-id.ts` - New: Dynamic organization ID helper
- `app/actions/organization.ts` - New: Server action for org ID
- `app/api/seed/route.ts` - New: Database seeding endpoint
- `app/actions/rules.ts` - Updated: Better error handling
- `app/(dashboard)/cancellation-rules/page.tsx` - Updated: Auto-seed logic
- `components/cancellation-rules/template-library.tsx` - Updated: Dynamic org ID

## Next Steps

1. **Deploy the changes** - Code is already pushed to GitHub
2. **Wait for Vercel deployment** - Should trigger automatically
3. **Visit cancellation rules page** - It will auto-seed if needed
4. **Verify rules appear** - Should see at least one default rule

## Troubleshooting

If rules still don't appear:

1. **Check Vercel Logs**:
   - Go to Vercel Dashboard → Deployments → Latest → Functions
   - Look for errors in `/api/seed` or server actions

2. **Check Database Connection**:
   - Verify `DATABASE_URL` is set correctly in Vercel
   - Test connection via Supabase dashboard

3. **Manual Database Check**:
   - Connect to Supabase database
   - Run: `SELECT * FROM organizations WHERE name = 'Demo Store';`
   - Run: `SELECT * FROM rules;`

4. **Check Browser Console**:
   - Open browser dev tools
   - Look for errors in console
   - Check Network tab for failed API calls

## Security Note

The `/api/seed` endpoint is currently unprotected. In production, you should:
- Add authentication check
- Use a secret token: `SEED_SECRET` environment variable
- Or restrict to admin users only
