# Supabase Connection Pooler Fix for Vercel

## Problem

Database connection fails with "Can't reach database server" error even after:
- ✅ Password encoding fixed
- ✅ SSL mode added (`?sslmode=require`)

## Root Cause

**Vercel serverless functions should use Supabase's connection pooler**, not direct connections.

- **Direct connection** (port 5432): For long-lived processes, VMs, containers
- **Connection pooler** (port 6543): For serverless functions (Vercel, AWS Lambda, etc.)

Direct connections can fail in serverless environments due to:
- IPv6/IPv4 network limitations
- Connection limits being exhausted
- Cold start connection issues

## Solution: Use Connection Pooler

### Step 1: Get Pooler Connection String from Supabase

1. Go to **Supabase Dashboard** → Your Project → **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **Connection pooling** tab (not "Direct connection")
4. Choose **Transaction mode** (recommended for serverless)
5. Copy the connection string - it should look like:
   ```
   postgresql://postgres.PROJECT_REF:password@aws-0-REGION.pooler.supabase.com:6543/postgres
   ```
   Note: Port is `6543` (not `5432`) and host includes `pooler`

### Step 2: Update Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `DATABASE_URL`
3. Replace with the **pooler connection string** from Step 1
4. Add `?sslmode=require` if not already present:
   ```
   postgresql://postgres.PROJECT_REF:password@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
   ```
5. Click **Save**
6. **Redeploy** your application

### Step 3: Verify Connection

After deployment, check Vercel logs. You should see:
- `[DEBUG] Using pooler connection` log
- Successful database connections
- No "Can't reach database server" errors

## Connection String Format Comparison

### ❌ Direct Connection (Current - Not Recommended for Vercel)
```
postgresql://postgres:password@db.typrzhuntlifvlbrqhyp.supabase.co:5432/postgres?sslmode=require
```
- Port: `5432`
- Host: `db.*.supabase.co`
- Issues: May fail in serverless environments

### ✅ Pooler Connection (Recommended for Vercel)
```
postgresql://postgres.PROJECT_REF:password@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```
- Port: `6543`
- Host: `*.pooler.supabase.com`
- Benefits: Better for serverless, handles connection pooling automatically

## Additional Notes

### Transaction Mode vs Session Mode

- **Transaction mode** (port 6543): Recommended for serverless
  - Each function invocation gets a connection for one transaction
  - Better connection reuse
  - Some Postgres features (prepared statements) may not work
  
- **Session mode** (port 5432 with pooler): For features requiring session state
  - Full Postgres feature support
  - Less efficient for serverless

### Prisma Configuration

Prisma works with both direct and pooler connections. The code automatically:
- Detects if using direct connection (port 5432)
- Logs a warning in production suggesting pooler
- Adds SSL mode if missing
- Encodes passwords with special characters

## Troubleshooting

### Still Getting "Can't reach database server"?

1. **Check Supabase project status**: Free tier projects pause after 7 days of inactivity
   - Go to Supabase Dashboard → Your Project
   - If paused, click "Resume" or "Restore"

2. **Verify connection string format**:
   - Must use pooler host (`*.pooler.supabase.com`)
   - Port must be `6543` (transaction mode)
   - Include `?sslmode=require`

3. **Check Vercel environment variables**:
   - Ensure `DATABASE_URL` is set for Production environment
   - Value matches Supabase dashboard exactly

4. **Network issues**: Some regions may have connectivity issues
   - Try using a different Supabase region
   - Check Vercel deployment region matches Supabase region

## Quick Reference

**Get pooler connection string:**
1. Supabase Dashboard → Settings → Database
2. Connection string → Connection pooling → Transaction mode
3. Copy and add `?sslmode=require`

**Update in Vercel:**
1. Settings → Environment Variables
2. Update `DATABASE_URL` with pooler string
3. Redeploy
