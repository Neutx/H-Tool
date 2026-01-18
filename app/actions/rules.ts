"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CreateRuleFormData } from "@/lib/types";

/**
 * Get all rules for an organization
 */
export async function getRules(organizationId: string) {
  try {
    // First, check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      console.error(`Organization ${organizationId} not found`);
      return { success: false, error: `Organization not found. Please seed the database.` };
    }

    const rules = await prisma.rule.findMany({
      where: { organizationId },
      include: {
        template: true,
      },
      orderBy: { priority: "asc" },
    });

    console.log(`Found ${rules.length} rules for organization ${organizationId}`);
    return { success: true, data: rules };
  } catch (error) {
    console.error("Error fetching rules:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Full error details:", errorMessage);
    return { success: false, error: `Failed to fetch rules: ${errorMessage}` };
  }
}

/**
 * Get a single rule by ID
 */
export async function getRule(id: string) {
  try {
    const rule = await prisma.rule.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!rule) {
      return { success: false, error: "Rule not found" };
    }

    return { success: true, data: rule };
  } catch (error) {
    console.error("Error fetching rule:", error);
    return { success: false, error: "Failed to fetch rule" };
  }
}

/**
 * Create a new rule
 */
export async function createRule(data: CreateRuleFormData & { organizationId: string }) {
  try {
    const rule = await prisma.rule.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId: data.organizationId,
        conditions: data.conditions as any,
        actions: data.actions as any,
        priority: data.priority ?? 0,
        active: data.active ?? true,
      },
    });

    revalidatePath("/cancellation-rules");
    return { success: true, data: rule };
  } catch (error) {
    console.error("Error creating rule:", error);
    return { success: false, error: "Failed to create rule" };
  }
}

/**
 * Update an existing rule
 */
export async function updateRule(
  id: string,
  data: Partial<CreateRuleFormData>
) {
  try {
    const rule = await prisma.rule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.conditions && { conditions: data.conditions as any }),
        ...(data.actions && { actions: data.actions as any }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    revalidatePath("/cancellation-rules");
    return { success: true, data: rule };
  } catch (error) {
    console.error("Error updating rule:", error);
    return { success: false, error: "Failed to update rule" };
  }
}

/**
 * Delete a rule
 */
export async function deleteRule(id: string) {
  try {
    await prisma.rule.delete({
      where: { id },
    });

    revalidatePath("/cancellation-rules");
    return { success: true };
  } catch (error) {
    console.error("Error deleting rule:", error);
    return { success: false, error: "Failed to delete rule" };
  }
}

/**
 * Toggle rule active status
 */
export async function toggleRuleStatus(id: string) {
  try {
    const rule = await prisma.rule.findUnique({ where: { id } });
    if (!rule) {
      return { success: false, error: "Rule not found" };
    }

    const updated = await prisma.rule.update({
      where: { id },
      data: { active: !rule.active },
    });

    revalidatePath("/cancellation-rules");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error toggling rule status:", error);
    return { success: false, error: "Failed to toggle rule status" };
  }
}

/**
 * Reorder rules (update priorities)
 */
export async function reorderRules(
  rules: { id: string; priority: number }[]
) {
  try {
    // Update all rules in a transaction
    await prisma.$transaction(
      rules.map((rule) =>
        prisma.rule.update({
          where: { id: rule.id },
          data: { priority: rule.priority },
        })
      )
    );

    revalidatePath("/cancellation-rules");
    return { success: true };
  } catch (error) {
    console.error("Error reordering rules:", error);
    return { success: false, error: "Failed to reorder rules" };
  }
}

/**
 * Get all rule templates
 * Auto-seeds templates if none exist
 */
export async function getRuleTemplates() {
  try {
    const templates = await prisma.ruleTemplate.findMany({
      orderBy: [{ recommended: "desc" }, { name: "asc" }],
    });

    console.log(`Found ${templates.length} rule templates`);
    
    // If no templates, try to seed them via API call
    if (templates.length === 0) {
      console.log("No templates found, attempting to seed...");
      try {
        // Use absolute URL in production, relative in development
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
          (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
        const seedUrl = `${baseUrl}/api/seed`;
        
        console.log(`Calling seed endpoint: ${seedUrl}`);
        const response = await fetch(seedUrl, { 
          method: "POST",
          cache: "no-store",
        });
        
        if (response.ok) {
          const seedData = await response.json();
          console.log("Seed response:", seedData);
          
          // Retry fetching templates after seeding
          const retryTemplates = await prisma.ruleTemplate.findMany({
            orderBy: [{ recommended: "desc" }, { name: "asc" }],
          });
          console.log(`Found ${retryTemplates.length} templates after seeding`);
          return { success: true, data: retryTemplates };
        } else {
          const errorData = await response.json();
          console.error("Seed failed:", errorData);
        }
      } catch (seedError) {
        console.error("Error seeding templates:", seedError);
        // Don't fail completely, just return empty array
      }
    }

    return { success: true, data: templates };
  } catch (error) {
    console.error("Error fetching rule templates:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to fetch rule templates: ${errorMessage}` };
  }
}

/**
 * Activate a rule template (create a new rule from template)
 */
export async function activateTemplate(
  templateId: string,
  organizationId: string,
  customizations?: Partial<CreateRuleFormData>
) {
  try {
    const template = await prisma.ruleTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Get the highest priority rule to add new rule at the end
    const highestPriorityRule = await prisma.rule.findFirst({
      where: { organizationId },
      orderBy: { priority: "desc" },
    });

    const nextPriority = (highestPriorityRule?.priority ?? 0) + 1;

    const rule = await prisma.rule.create({
      data: {
        name: customizations?.name ?? template.name,
        description: customizations?.description ?? template.description,
        organizationId,
        conditions: (customizations?.conditions ?? template.conditions) as any,
        actions: (customizations?.actions ?? template.actions) as any,
        priority: customizations?.priority ?? nextPriority,
        active: customizations?.active ?? true,
        createdFromTemplateId: templateId,
      },
    });

    revalidatePath("/cancellation-rules");
    return { success: true, data: rule };
  } catch (error) {
    console.error("Error activating template:", error);
    return { success: false, error: "Failed to activate template" };
  }
}

/**
 * Increment rule usage count
 */
export async function incrementRuleUsage(ruleId: string) {
  try {
    await prisma.rule.update({
      where: { id: ruleId },
      data: { usageCount: { increment: 1 } },
    });
  } catch (error) {
    console.error("Error incrementing rule usage:", error);
  }
}
