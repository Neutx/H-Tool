# Database Connection String Fix

## Problem

The database connection was failing with error:
```
Can't reach database server at `db.typrzhuntlifvlbrqhyp.supabase.co:5432`
```

## Root Causes

1. **Password Encoding**: The PostgreSQL password contains special characters (`+`, `@`, `$`) that **must be URL-encoded** in connection strings:
   - Password: `9+y7@tuA7ZKhM6$`
   - The `@` symbol is interpreted as the separator between credentials and host, causing the password to be truncated

2. **SSL Requirement**: Supabase requires SSL connections. The connection string must include `?sslmode=require` parameter, otherwise connections will fail with "Can't reach database server" errors.

## Solution

### Option 1: Automatic Encoding (Recommended)

The code now automatically detects and encodes special characters in the password. **No manual changes needed** - just ensure your `DATABASE_URL` in Vercel matches your `.env.local` file.

### Option 2: Manual Encoding

If you prefer to manually encode the password in Vercel:

**Original password:** `9+y7@tuA7ZKhM6$`

**Encoded password:** `9%2By7%40tuA7ZKhM6%24`

**Original connection string:**
```
postgresql://postgres:9+y7@tuA7ZKhM6$@db.typrzhuntlifvlbrqhyp.supabase.co:5432/postgres
```

**Corrected connection string (for Vercel):**
```
postgresql://postgres:9%2By7%40tuA7ZKhM6%24@db.typrzhuntlifvlbrqhyp.supabase.co:5432/postgres?sslmode=require
```

**Note**: The code now automatically adds `?sslmode=require` if it's missing, so you can use either version.

### Encoding Reference

| Character | Encoded |
|-----------|---------|
| `+`       | `%2B`   |
| `@`       | `%40`   |
| `$`       | `%24`   |
| `#`       | `%23`   |
| `%`       | `%25`   |
| `:`       | `%3A`   |
| `/`       | `%2F`   |

## Steps to Fix in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `DATABASE_URL` in the list
3. Update it with the **encoded version** (or use the original - code will auto-encode):
   ```
   postgresql://postgres:9%2By7%40tuA7ZKhM6%24@db.typrzhuntlifvlbrqhyp.supabase.co:5432/postgres
   ```
4. Make sure it's set for **Production**, **Preview**, and **Development** environments
5. Click **Save**
6. **Redeploy** your application (or wait for next deployment)

## Verification

After updating, check the Vercel logs. You should see:
- `[DEBUG] Password encoding:` log if encoding was applied
- `[DEBUG] SSL mode added:` log if SSL parameter was added
- Successful database connections instead of "Can't reach database server" errors

## Additional Fixes Applied

The code now automatically:
1. **Encodes passwords** with special characters (`+`, `@`, `$`, etc.)
2. **Adds SSL mode** (`?sslmode=require`) if missing (required for Supabase)
3. **Prevents double-encoding** if password is already URL-encoded

## Additional Notes

- The automatic encoding only applies if special characters are detected
- If your password doesn't contain special characters, no encoding is applied
- This fix works for both local development and production (Vercel)
