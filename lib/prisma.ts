import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Helper function to encode password in DATABASE_URL if it contains special characters
 * PostgreSQL connection strings require URL encoding for special characters like @, +, $, etc.
 */
function getEncodedDatabaseUrl(): string | undefined {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return undefined;

  // Check if password contains special characters that need encoding
  // Format: postgresql://user:password@host:port/db
  const urlMatch = dbUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/);
  
  if (!urlMatch) {
    // URL format is invalid, return as-is
    return dbUrl;
  }

  const [, username, password, rest] = urlMatch;
  
  // Check if password is already URL-encoded (contains %XX patterns)
  const isAlreadyEncoded = /%[0-9A-Fa-f]{2}/.test(password);
  
  if (isAlreadyEncoded) {
    // Password is already encoded, return original
    // #region agent log
    console.log('[DEBUG] Password already encoded:', JSON.stringify({
      location: 'lib/prisma.ts:encodePassword',
      message: 'Password appears to be already URL-encoded',
      data: { passwordLength: password.length, host: rest.split(':')[0] }
    }));
    // #endregion
    return dbUrl;
  }
  
  // Check if password contains special characters that need encoding
  const needsEncoding = /[@+$#:/\?&=]/.test(password);
  
  if (!needsEncoding) {
    // No special characters, return original
    return dbUrl;
  }

  // Encode the password
  const encodedPassword = encodeURIComponent(password);
  
  // Reconstruct the URL with encoded password
  const encodedUrl = `postgresql://${username}:${encodedPassword}@${rest}`;
  
  // #region agent log
  console.log('[DEBUG] Password encoding:', JSON.stringify({
    location: 'lib/prisma.ts:encodePassword',
    message: 'Password encoded for DATABASE_URL',
    data: {
      originalPasswordLength: password.length,
      encodedPasswordLength: encodedPassword.length,
      passwordContainsSpecialChars: true,
      host: rest.split(':')[0],
    }
  }));
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
