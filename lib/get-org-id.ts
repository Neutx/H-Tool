/**
 * Helper function to get or create demo organization ID
 * This ensures we always have a valid organization ID
 */
import { prisma } from "./prisma";

const DEMO_ORG_NAME = "Demo Store";
let cachedOrgId: string | null = null;

export async function getDemoOrganizationId(): Promise<string> {
  // Return cached ID if available
  if (cachedOrgId) {
    return cachedOrgId;
  }

  try {
    // Try to find existing demo organization
    let organization = await prisma.organization.findFirst({
      where: { name: DEMO_ORG_NAME },
    });

    // If not found, create it
    if (!organization) {
      console.log("Creating demo organization...");
      organization = await prisma.organization.create({
        data: {
          name: DEMO_ORG_NAME,
          shopifyStoreUrl: "demo-store.myshopify.com",
          hasShopifyDomain: true,
        },
      });
    }

    cachedOrgId = organization.id;
    return organization.id;
  } catch (error) {
    console.error("Error getting organization ID:", error);
    // Fallback to hardcoded ID if database query fails
    return "cmkirf3lj0000jhhexsx6p1e3";
  }
}
