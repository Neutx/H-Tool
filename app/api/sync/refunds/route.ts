import { NextRequest, NextResponse } from "next/server";
import { syncShopifyRefunds } from "@/lib/refund-sync-service";

// Demo organization ID
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
    const result = await syncShopifyRefunds(DEMO_ORG_ID, 50);

    return NextResponse.json({
      message: "Refunds synced successfully",
      ...result,
    });
  } catch (error) {
    console.error("Refund sync error:", error);
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
    const result = await syncShopifyRefunds(DEMO_ORG_ID, 50);

    return NextResponse.json({
      message: "Manual sync completed",
      ...result,
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
