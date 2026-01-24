# Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migration
Run the database migration to create new tables:
```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate deploy

# Or if using db push (development only)
npx prisma db push
```

### 2. Seed Rule Templates
**IMPORTANT**: Rule templates must be seeded for all organizations to have access to them:
```bash
# Seed templates (works in both dev and production)
npx prisma db seed
```

This will create 5 rule templates:
- Auto-approve within 15 min (Recommended)
- Flag high-risk orders (Recommended)
- Deny if already fulfilled (Recommended)
- Auto-approve low-value orders
- Escalate VIP customers

### 3. Environment Variables
Ensure all required environment variables are set in Vercel:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (with `connection_limit=1&sslmode=require`)
- `DIRECT_URL` - Direct PostgreSQL connection (port 5432, for migrations)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `CRON_SECRET` - For scheduled sync jobs
- `SHOPIFY_ACCESS_TOKEN` - Shopify API access token
- `SHOPIFY_STORE_URL` - Your Shopify store URL (e.g., "your-store.myshopify.com")
- `SHOPIFY_API_VERSION` - Shopify API version (e.g., "2026-01")
- `SHOPIFY_WEBHOOK_SECRET` - Webhook signing secret from Shopify (get after registering webhooks)

**Optional (for Firebase Admin SDK):**
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

### 4. Firebase Configuration
1. Enable Google OAuth in Firebase Console
2. Add authorized domains (your Vercel domain)
3. Configure OAuth consent screen

### 5. Database Setup
- Ensure Supabase IP whitelisting allows Vercel IPs
- Verify connection pooling is enabled
- Test database connection from Vercel

## Deployment Steps

### 1. Build Verification
```bash
npm run build
```
Ensure build completes successfully.

### 2. Deploy to Vercel
```bash
# Push to main branch (auto-deploys)
git push origin main

# Or deploy manually
vercel --prod
```

### 3. Post-Deployment

#### Run Database Migration
After deployment, run migrations:
```bash
# Via Vercel CLI or Supabase dashboard
npx prisma migrate deploy
```

#### Seed Templates
Run seed script to ensure templates exist:
```bash
npx prisma db seed
```

#### Verify Environment Variables
Check that all environment variables are set correctly in Vercel dashboard.

## Post-Deployment Verification

### 1. Test Authentication Flow
- [ ] Navigate to `/login`
- [ ] Sign in with Google OAuth
- [ ] Verify redirect to onboarding or dashboard

### 2. Test Organization Creation
- [ ] Create new organization
- [ ] Verify organization appears in switcher
- [ ] Test organization switching

### 3. Test Rule Templates
- [ ] Navigate to Cancellation Rules
- [ ] Click "Templates" button
- [ ] Verify 5 templates are visible
- [ ] Test activating a template

### 4. Test Admin Panel
- [ ] Navigate to `/admin`
- [ ] Verify Team tab shows members
- [ ] Test creating invite
- [ ] Test organization settings

### 5. Test Dashboard Pages
- [ ] Verify all dashboard pages load
- [ ] Check data is scoped to active organization
- [ ] Test data fetching for each page

## Common Issues & Fixes

### Issue: "No templates available"
**Fix**: Run `npx prisma db seed` to create templates

### Issue: Database connection errors
**Fix**: 
- Verify `DATABASE_URL` has `connection_limit=1&sslmode=require`
- Check Supabase IP whitelist includes Vercel IPs
- Ensure `DIRECT_URL` is set for migrations

### Issue: Authentication not working
**Fix**:
- Verify Firebase OAuth is enabled
- Check authorized domains include your Vercel domain
- Verify all Firebase environment variables are set

### Issue: Organization not found errors
**Fix**:
- Ensure user has created/joined an organization
- Check `UserSession` table has `activeOrganizationId` set
- Verify middleware is not blocking routes

## Rollback Plan

If deployment fails:
1. Revert to previous commit
2. Redeploy previous version
3. Check database migration status
4. Verify environment variables

## Monitoring

After deployment, monitor:
- Vercel function logs for errors
- Database connection pool usage
- Authentication success/failure rates
- API response times
