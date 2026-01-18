import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Seed database endpoint for production
 * This creates the demo organization and initial data
 * 
 * SECURITY: In production, you should protect this endpoint with authentication
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/seed/route.ts:10',message:'Seed endpoint called',data:{hasDatabaseUrl:!!process.env.DATABASE_URL,databaseUrlLength:process.env.DATABASE_URL?.length||0,databaseUrlHost:process.env.DATABASE_URL?.match(/@([^:]+):/)?.[1]||'NOT_FOUND',nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  try {
    // Optional: Add authentication check here
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.SEED_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    console.log("🌱 Starting database seeding...");

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/seed/route.ts:22',message:'Before prisma.organization.findFirst',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Check if demo org already exists
    let organization = await prisma.organization.findFirst({
      where: { name: "Demo Store" },
    });

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/seed/route.ts:27',message:'After prisma.organization.findFirst',data:{foundOrganization:!!organization,organizationId:organization?.id||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!organization) {
      // Create Organization
      console.log("📦 Creating organization...");
      organization = await prisma.organization.create({
        data: {
          name: "Demo Store",
          shopifyStoreUrl: "demo-store.myshopify.com",
          hasShopifyDomain: true,
        },
      });
    }

    console.log(`✅ Organization ID: ${organization.id}`);

    // Create Rule Templates if they don't exist
    const existingTemplateCount = await prisma.ruleTemplate.count();
    console.log(`Found ${existingTemplateCount} existing templates`);
    
    let templatesCreated = false;
    if (existingTemplateCount === 0) {
      console.log("📋 Creating rule templates...");
      await Promise.all([
        prisma.ruleTemplate.create({
          data: {
            name: "Auto-approve within 15 min",
            description: "Automatically approve cancellations requested within 15 minutes of order placement",
            category: "time_based",
            conditions: {
              timeWindow: 15,
              orderStatus: ["open", "pending"],
              fulfillmentStatus: ["unfulfilled"],
            },
            actions: {
              type: "auto_approve",
              notifyCustomer: true,
            },
            recommended: true,
          },
        }),
        prisma.ruleTemplate.create({
          data: {
            name: "Flag high-risk orders",
            description: "Send high-risk cancellation requests to manual review",
            category: "risk_based",
            conditions: {
              riskLevel: ["high"],
            },
            actions: {
              type: "manual_review",
              notifyMerchant: true,
            },
            recommended: true,
          },
        }),
        prisma.ruleTemplate.create({
          data: {
            name: "Deny if already fulfilled",
            description: "Automatically deny cancellations for already fulfilled orders",
            category: "status_based",
            conditions: {
              fulfillmentStatus: ["fulfilled"],
            },
            actions: {
              type: "deny",
              notifyCustomer: true,
            },
            recommended: true,
          },
        }),
      ]);
      templatesCreated = true;
      console.log("✅ Created 3 rule templates");
    } else {
      console.log(`✅ Templates already exist (${existingTemplateCount} templates)`);
    }

    // Create Active Rules if they don't exist
    const existingRulesCount = await prisma.rule.count({
      where: { organizationId: organization.id },
    });

    let rulesCreated = false;
    if (existingRulesCount === 0) {
      console.log("⚙️ Creating active rules...");
      const templates = await prisma.ruleTemplate.findMany();
      
      await prisma.rule.create({
        data: {
          name: "Auto-approve within 15 min",
          description: "Automatically approve cancellations within 15 minutes",
          organizationId: organization.id,
          conditions: {
            timeWindow: 15,
            orderStatus: ["open", "pending"],
            fulfillmentStatus: ["unfulfilled"],
          },
          actions: {
            type: "auto_approve",
            notifyCustomer: true,
          },
          priority: 1,
          active: true,
          usageCount: 0,
          createdFromTemplateId: templates[0]?.id,
        },
      });
      rulesCreated = true;
      console.log("✅ Created 1 active rule");
    } else {
      console.log(`✅ Rules already exist (${existingRulesCount} rules)`);
    }

    const finalRulesCount = await prisma.rule.count({ where: { organizationId: organization.id } });
    const finalTemplateCount = await prisma.ruleTemplate.count();

    console.log(`✅ Seeding complete: ${finalTemplateCount} templates, ${finalRulesCount} rules`);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      organizationId: organization.id,
      rulesCount: finalRulesCount,
      templatesCount: finalTemplateCount,
      createdTemplates: templatesCreated,
      createdRules: rulesCreated,
    });
  } catch (error) {
    console.error("Seed error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Unknown";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/b2266f99-14f8-4aa6-9bf9-5891ccc40bc4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/seed/route.ts:132',message:'Seed error caught',data:{errorName,errorMessage,hasStack:!!errorStack,errorMessageIncludesDatabase:errorMessage.includes('database')||errorMessage.includes('DATABASE')||errorMessage.includes('Can\'t reach'),hasDatabaseUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    console.error("Full error details:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Get organization ID endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const organization = await prisma.organization.findFirst({
      where: { name: "Demo Store" },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "No organization found. Please seed the database first." },
        { status: 404 }
      );
    }

    const templatesCount = await prisma.ruleTemplate.count();
    const rulesCount = await prisma.rule.count({ where: { organizationId: organization.id } });

    return NextResponse.json({
      success: true,
      organizationId: organization.id,
      name: organization.name,
      templatesCount,
      rulesCount,
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch organization",
      },
      { status: 500 }
    );
  }
}
