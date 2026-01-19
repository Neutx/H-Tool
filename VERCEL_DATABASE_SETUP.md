# Vercel Database Setup Guide

## Critical Configuration for Prisma + Supabase on Vercel

### Environment Variables Required

Set these in **Vercel Dashboard → Settings → Environment Variables**:

#### 1. DATABASE_URL (Connection Pooler - Required)
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.typrzhuntlifvlbrqhyp.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

**Important:**
- Use port **6543** (connection pooler)
- Must include `connection_limit=1` for Vercel serverless
- Must include `pgbouncer=true` for Supabase pooler
- Must include `sslmode=require` for SSL

#### 2. DIRECT_URL (Direct Connection - Required for Migrations)
```env
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.typrzhuntlifvlbrqhyp.supabase.co:5432/postgres?sslmode=require"
```

**Important:**
- Use port **5432** (direct connection)
- Used by Prisma for migrations and introspection
- Same password as DATABASE_URL

### Why Two URLs?

- **DATABASE_URL**: Used by Prisma Client for queries (serverless-safe with pooler)
- **DIRECT_URL**: Used by Prisma Migrate for schema changes (needs direct connection)

### After Setting Environment Variables

⚠️ **CRITICAL**: Vercel does NOT hot-reload environment variables!

**You MUST redeploy:**
1. Go to Vercel Dashboard → Deployments
2. Click "Redeploy" on the latest deployment
3. OR push a new commit to trigger deployment

### Verify Setup

1. Check `prisma/schema.prisma` has:
   ```prisma
   datasource db {
     provider   = "postgresql"
     url        = env("DATABASE_URL")
     directUrl  = env("DIRECT_URL")
   }
   ```

2. Check `package.json` has:
   ```json
   {
     "scripts": {
       "postinstall": "prisma generate",
       "build": "prisma generate && next build"
     }
   }
   ```

3. Check API routes using Prisma have:
   ```typescript
   export const runtime = "nodejs";
   ```

### Common Issues

#### ❌ "Can't reach database server at ...:6543"
- **Cause**: Missing `connection_limit=1` or wrong port
- **Fix**: Add `connection_limit=1` to DATABASE_URL

#### ❌ "Prisma Client not generated"
- **Cause**: `prisma generate` not running in build
- **Fix**: Ensure `postinstall` script exists

#### ❌ "Edge runtime not supported"
- **Cause**: Using Edge runtime with Prisma
- **Fix**: Add `export const runtime = "nodejs"` to route files

#### ❌ "Still using old env vars"
- **Cause**: Didn't redeploy after updating env vars
- **Fix**: Redeploy on Vercel

### Security Note

⚠️ **ROTATE YOUR DATABASE PASSWORD** if you've shared it publicly!

1. Go to Supabase Dashboard → Settings → Database
2. Click "Reset Database Password"
3. Update both DATABASE_URL and DIRECT_URL in Vercel
4. Update `.env.local` locally
5. Redeploy on Vercel
