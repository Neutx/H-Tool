import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Helper function to encode password and ensure SSL parameters in DATABASE_URL
 * PostgreSQL connection strings require:
 * 1. URL encoding for special characters like @, +, $, etc.
 * 2. SSL mode parameter for Supabase (sslmode=require)
 */
function getEncodedDatabaseUrl(): string | undefined {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return undefined;

  // Check if password contains special characters that need encoding
  // Format: postgresql://user:password@host:port/db?params
  const urlMatch = dbUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/);
  
  if (!urlMatch) {
    // URL format is invalid, return as-is
    return dbUrl;
  }

  const [, username, password, rest] = urlMatch;
  
  // Split rest into host:port/db and query params
  const [hostPortDb, ...queryParts] = rest.split('?');
  const existingParams = queryParts.join('?');
  
  // Check if password is already URL-encoded (contains %XX patterns)
  const isAlreadyEncoded = /%[0-9A-Fa-f]{2}/.test(password);
  
  let finalPassword = password;
  let passwordWasEncoded = false;
  
  if (!isAlreadyEncoded) {
    // Check if password contains special characters that need encoding
    const needsEncoding = /[@+$#:/\?&=]/.test(password);
    
    if (needsEncoding) {
      // Encode the password
      finalPassword = encodeURIComponent(password);
      passwordWasEncoded = true;
      
      // #region agent log
      console.log('[DEBUG] Password encoding:', JSON.stringify({
        location: 'lib/prisma.ts:encodePassword',
        message: 'Password encoded for DATABASE_URL',
        data: {
          originalPasswordLength: password.length,
          encodedPasswordLength: finalPassword.length,
          passwordContainsSpecialChars: true,
          host: hostPortDb.split(':')[0],
        }
      }));
      // #endregion
    }
  } else {
    // #region agent log
    console.log('[DEBUG] Password already encoded:', JSON.stringify({
      location: 'lib/prisma.ts:encodePassword',
      message: 'Password appears to be already URL-encoded',
      data: { passwordLength: password.length, host: hostPortDb.split(':')[0] }
    }));
    // #endregion
  }
  
  // Check if SSL mode is already present
  const hasSslMode = /[?&]sslmode=/.test(existingParams);
  
  // Build query parameters
  const params = new URLSearchParams(existingParams);
  
  // Add SSL mode if not present (required for Supabase)
  if (!hasSslMode) {
    params.set('sslmode', 'require');
    // #region agent log
    console.log('[DEBUG] SSL mode added:', JSON.stringify({
      location: 'lib/prisma.ts:addSslMode',
      message: 'Added sslmode=require to DATABASE_URL',
      data: { hadSslMode: false, host: hostPortDb.split(':')[0] }
    }));
    // #endregion
  } else {
    // #region agent log
    console.log('[DEBUG] SSL mode already present:', JSON.stringify({
      location: 'lib/prisma.ts:checkSslMode',
      message: 'DATABASE_URL already has sslmode parameter',
      data: { sslMode: params.get('sslmode'), host: hostPortDb.split(':')[0] }
    }));
    // #endregion
  }
  
  // Reconstruct the URL
  const queryString = params.toString();
  const encodedUrl = `postgresql://${username}:${finalPassword}@${hostPortDb}${queryString ? '?' + queryString : ''}`;
  
  // #region agent log
  if (passwordWasEncoded || !hasSslMode) {
    console.log('[DEBUG] DATABASE_URL processed:', JSON.stringify({
      location: 'lib/prisma.ts:finalUrl',
      message: 'DATABASE_URL processed with encoding/SSL',
      data: {
        passwordWasEncoded,
        sslModeAdded: !hasSslMode,
        finalUrlLength: encodedUrl.length,
        host: hostPortDb.split(':')[0],
      }
    }));
  }
  // #endregion
  
  return encodedUrl;
}

// #region agent log
const dbUrl = process.env.DATABASE_URL;
const hasDbUrl = !!dbUrl;
const dbUrlLength = dbUrl?.length || 0;
const dbUrlPreview = dbUrl ? dbUrl.substring(0, 50) + '...' : 'NOT_SET';
const dbUrlHost = dbUrl?.match(/@([^:]+):/)?.[1] || 'NOT_FOUND';
console.log('[DEBUG] Prisma init:', JSON.stringify({location:'lib/prisma.ts:10',message:'Prisma client initialization',hasDatabaseUrl:hasDbUrl,databaseUrlLength:dbUrlLength,databaseUrlPreview:dbUrlPreview,databaseUrlHost:dbUrlHost,nodeEnv:process.env.NODE_ENV}));
// #endregion

// Get encoded database URL (handles special characters in password)
const encodedDbUrl = getEncodedDatabaseUrl();

// Override DATABASE_URL if encoding was needed
if (encodedDbUrl && encodedDbUrl !== dbUrl) {
  process.env.DATABASE_URL = encodedDbUrl;
  // #region agent log
  console.log('[DEBUG] DATABASE_URL updated:', JSON.stringify({
    location: 'lib/prisma.ts:override',
    message: 'DATABASE_URL updated with encoded password',
    data: { urlWasEncoded: true }
  }));
  // #endregion
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// #region agent log
console.log('[DEBUG] Prisma created:', JSON.stringify({location:'lib/prisma.ts:18',message:'Prisma client created',isProduction:process.env.NODE_ENV==='production'}));
// #endregion

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
