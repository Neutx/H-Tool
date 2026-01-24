import { NextRequest, NextResponse } from "next/server";
import { orchestrateShopifySync } from "@/lib/shopify-sync-orchestrator";
import { prisma } from "@/lib/prisma";

// Force Node.js runtime (Prisma requires Node.js, not Edge)
export const runtime = "nodejs";

// Demo organization ID (can be made dynamic later)
const DEMO_ORG_ID = "cmkirf3lj0000jhhexsx6p1e3";

export async function GET(request: NextRequest) {
  // Verify authorization (Vercel Cron secret)
  // Vercel automatically sends Authorization: Bearer <CRON_SECRET> header
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, require CRON_SECRET to be set
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // In development, allow if CRON_SECRET is not set, but verify if it is set
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Use orchestrator to sync all data types (cancellations, returns, refunds)
    const result = await orchestrateShopifySync(DEMO_ORG_ID, 50);

    return NextResponse.json({
      message: "Shopify data synced successfully",
      success: result.success,
      cancellations: result.cancellations,
      returns: result.returns,
      refunds: result.refunds,
      totalSynced: result.totalSynced,
      totalNew: result.totalNew,
      totalUpdated: result.totalUpdated,
      errors: result.allErrors,
      diagnostics: result.allDiagnostics,
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}

// Allow manual sync via POST
export async function POST(request: NextRequest) {
  try {
    // Optional: Get organizationId from request body
    const body = await request.json().catch(() => ({}));
    const organizationId = body.organizationId || DEMO_ORG_ID;

    // Use orchestrator to sync all data types
    const result = await orchestrateShopifySync(organizationId, 50);

    return NextResponse.json({
      message: "Manual sync completed",
      success: result.success,
      cancellations: result.cancellations,
      returns: result.returns,
      refunds: result.refunds,
      totalSynced: result.totalSynced,
      totalNew: result.totalNew,
      totalUpdated: result.totalUpdated,
      errors: result.allErrors,
      diagnostics: result.allDiagnostics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
