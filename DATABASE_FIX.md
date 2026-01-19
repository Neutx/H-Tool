# Database Connection Fix Guide

## Problem
You're getting Prisma authentication errors:
```
Authentication failed against database server at `db.typrzhuntlifvlbrqhyp.supabase.co`, 
the provided database credentials for `postgres` are not valid.
```

## Root Causes

1. **IP Blocking** ⚠️ **MOST COMMON**: Supabase may block your IP after multiple failed connection attempts
   - **Solution**: Use mobile hotspot/VPN, or whitelist your IP in Supabase Dashboard
2. **Invalid/Expired Password**: The database password in your `.env.local` may be incorrect or expired
3. **Missing SSL Parameters**: Supabase requires SSL connections
4. **Wrong Connection String Format**: May need connection pooler URL instead

## Solutions

### Option 1: Fix IP Blocking (If you see authentication errors)

If you're getting authentication errors but your password is correct, Supabase may have blocked your IP:

1. **Quick Test**: Try connecting from a different network (mobile hotspot, VPN)
   - If it works, your IP is blocked
2. **Whitelist Your IP**:
   - Go to Supabase Dashboard → **Project Settings** → **Database**
   - Find **Network Restrictions** or **IP Allowlist**
   - Add your current IP address
   - Or temporarily disable IP restrictions for development
3. **Use Connection Pooler** (Less likely to trigger blocks):
   - Use port 6543 instead of 5432
   - See Option 2 below

### Option 2: Update Your Database Password

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **Project Settings** → **Database** → **Connection string**
3. Select **URI** format
4. Copy the new connection string
5. Update `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.typrzhuntlifvlbrqhyp.supabase.co:5432/postgres?sslmode=require"
   ```
   Replace `[YOUR-PASSWORD]` with your actual password

### Option 3: Use Connection Pooler (Better for Production & Avoids IP Blocks)

Supabase provides a connection pooler that handles connections better:

1. In Supabase Dashboard → **Project Settings** → **Database**
2. Find **Connection Pooling** section
3. Copy the **Transaction** mode connection string (port 6543)
4. Update `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.typrzhuntlifvlbrqhyp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
   ```

### Option 4: Reset Database Password

If you've lost your password:

1. Go to Supabase Dashboard → **Project Settings** → **Database**
2. Click **Reset Database Password**
3. Copy the new password
4. Update `.env.local` with the new connection string

## Verify Connection

After updating, test the connection:

```bash
# Generate Prisma client
npm run db:generate

# Test connection (this will fail if credentials are wrong)
npx prisma db pull
```

## Important Notes

- **Never commit `.env.local`** to git (it's already in `.gitignore`)
- The password in your `.env` file (`9+y7@tuA7ZKhM6$`) might be outdated
- Always use SSL (`sslmode=require`) for Supabase connections
- For production, use the connection pooler (port 6543)

## Current Fix Applied

The code has been updated to automatically add SSL parameters if missing, but you still need to:
1. Verify your database password is correct
2. Update `.env.local` with valid credentials

## Vercel-Specific Setup

For Vercel deployments, see `VERCEL_DATABASE_SETUP.md` for:
- Required environment variables (DATABASE_URL + DIRECT_URL)
- Connection pooler configuration
- Runtime settings
- Common Vercel-specific issues
