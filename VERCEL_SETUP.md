# Vercel Deployment Setup Guide

## Quick Setup Steps

### 1. Set Environment Variables in Vercel

Go to your Vercel project dashboard → **Settings** → **Environment Variables** and add all the following variables:

#### Database
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.your-project.supabase.co:5432/postgres
```
**Get this from:** Your `.env.local` file or Supabase dashboard

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
**Get this from:** Your `.env.local` file or Supabase dashboard

#### Firebase
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```
**Get this from:** Your `.env.local` file or Firebase console

#### Shopify
```
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-shopify-access-token
SHOPIFY_API_VERSION=2026-01
```
**Get this from:** Your `.env.local` file or Shopify admin

#### Cron Secret
```
CRON_SECRET=your-secure-random-secret-here
```
**Get this from:** Your `.env` file (the one we generated earlier: `80a6fb9417fc62e5192de0b7759089bb1a4a4758aa1e64a1c8125f5f2bd1327e`)

#### App Config
```
NEXT_PUBLIC_APP_URL=https://h-tool.vercel.app
NODE_ENV=production
```

**Important:** 
- Set these for **Production**, **Preview**, and **Development** environments
- Click "Save" after adding each variable

### 2. Fix Build Configuration

The build script has been updated to automatically generate Prisma client. The `package.json` now includes:
- `postinstall`: Runs `prisma generate` automatically after npm install
- `build`: Runs `prisma generate && next build`

### 3. Redeploy

After setting environment variables:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the failed deployment
3. Click **"Redeploy"** or push a new commit to trigger automatic deployment

### 4. Verify Deployment

Once deployed successfully:
1. Check the **Build Logs** to ensure Prisma client was generated
2. Visit your production URL
3. Check **Settings** → **Cron Jobs** to verify the refunds sync cron is registered

### Troubleshooting

#### Build Fails with Prisma Errors
- Ensure `DATABASE_URL` is set correctly
- Check that Prisma can connect to your database
- Verify `prisma generate` runs during build (check build logs)

#### Environment Variables Not Working
- Make sure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

#### Cron Job Not Appearing
- Verify `vercel.json` is in the root directory
- Check that `CRON_SECRET` environment variable is set
- Ensure the deployment completed successfully

### Next Steps After Deployment

1. **Test the application**: Visit your production URL
2. **Test cron endpoint**: Use the test command from VERCEL_DEPLOYMENT.md
3. **Monitor logs**: Check Vercel logs for any runtime errors
4. **Set up database**: Run migrations if needed (may need to do this manually or via a script)
