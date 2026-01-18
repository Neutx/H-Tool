import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// #region agent log
fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:10',message:'Prisma client initialization',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,databaseUrlLength:process.env.DATABASE_URL?.length||0,databaseUrlPreview:process.env.DATABASE_URL?.substring(0,30)+'...'||'NOT_SET',nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// #region agent log
fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:18',message:'Prisma client created',data:{isProduction:process.env.NODE_ENV==='production'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

