"use server";

import { getDemoOrganizationId } from "@/lib/get-org-id";

/**
 * Get demo organization ID (server action)
 */
export async function getOrganizationId() {
  try {
    const orgId = await getDemoOrganizationId();
    return { success: true, organizationId: orgId };
  } catch (error) {
    console.error("Error getting organization ID:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to get organization ID",
      organizationId: "cmkirf3lj0000jhhexsx6p1e3" // Fallback
    };
  }
}
