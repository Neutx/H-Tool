"use client";

import { useState, useEffect } from "react";
import { RulesDashboard } from "@/components/cancellation-rules/rules-dashboard";
import { RuleForm } from "@/components/cancellation-rules/rule-form";
import { TemplateLibrary } from "@/components/cancellation-rules/template-library";
import { ReviewQueue } from "@/components/cancellation-rules/review-queue";
import { OrderReviewPanel } from "@/components/cancellation-rules/order-review-panel";
import { getRules, deleteRule, toggleRuleStatus, createRule, updateRule } from "@/app/actions/rules";
import { getReviewQueueItems } from "@/app/actions/review-queue";
import { getOrganizationId } from "@/app/actions/organization";
import { showUndoDeleteToast } from "@/lib/undo-delete";
import { toast } from "sonner";
import type { Rule } from "@/lib/types";

const DEMO_USER = "Admin User"; // TODO: Get from auth context

export default function CancellationRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);

  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null);

  const [deletedRules, setDeletedRules] = useState<Map<string, Rule>>(new Map());

  // Fetch data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadRules(), loadReviewQueue()]);
    setLoading(false);
  };

  const seedDatabase = async (orgId?: string) => {
    try {
      console.log("Calling seed endpoint...");
      const seedResponse = await fetch("/api/seed", { method: "POST" });
      if (seedResponse.ok) {
        const seedData = await seedResponse.json();
        console.log("Seed response:", seedData);
        if (seedData.success) {
          toast.success(
            `Database seeded: ${seedData.templatesCount} templates, ${seedData.rulesCount} rules`,
            { position: "bottom-left" }
          );
          return seedData.organizationId || orgId;
        }
      } else {
        const errorData = await seedResponse.json();
        console.error("Seed failed:", errorData);
        toast.error(`Seed failed: ${errorData.error}`, {
          position: "bottom-left",
        });
      }
    } catch (seedErr) {
      console.error("Error seeding database:", seedErr);
      toast.error("Failed to seed database", {
        position: "bottom-left",
      });
    }
    return orgId;
  };

  const loadRules = async () => {
    try {
      const orgResult = await getOrganizationId();
      const orgId = orgResult.organizationId || "cmkirf3lj0000jhhexsx6p1e3";
      
      console.log(`Loading rules for organization: ${orgId}`);
      const result = await getRules(orgId);
      
      if (result.success && result.data) {
        console.log(`Loaded ${result.data.length} rules`);
        setRules(result.data as Rule[]);
        
        // If no rules found, try seeding
        if (result.data.length === 0) {
          console.log("No rules found, attempting to seed database...");
          const seededOrgId = await seedDatabase(orgId);
          if (seededOrgId) {
            // Retry loading rules after seeding
            const retryResult = await getRules(seededOrgId);
            if (retryResult.success && retryResult.data) {
              console.log(`Loaded ${retryResult.data.length} rules after seeding`);
              setRules(retryResult.data as Rule[]);
            }
          }
        }
      } else {
        console.error("Failed to load rules:", result.error);
        // Try seeding if organization not found
        if (result.error?.includes("not found")) {
          const seededOrgId = await seedDatabase();
          if (seededOrgId) {
            const retryResult = await getRules(seededOrgId);
            if (retryResult.success && retryResult.data) {
              setRules(retryResult.data as Rule[]);
            }
          }
        } else {
          toast.error(result.error || "Failed to load rules", {
            position: "bottom-left",
          });
        }
      }
    } catch (error) {
      console.error("Error loading rules:", error);
      // Last resort: try seeding
      await seedDatabase();
    }
  };

  const loadReviewQueue = async () => {
    try {
      const orgResult = await getOrganizationId();
      const orgId = orgResult.organizationId || "cmkirf3lj0000jhhexsx6p1e3";
      const result = await getReviewQueueItems(orgId);
      if (result.success && result.data) {
        setReviewQueue(result.data as any[]);
      }
    } catch (error) {
      console.error("Error loading review queue:", error);
    }
  };

  const handleCreateRule = () => {
    setSelectedRule(null);
    setRuleFormOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setSelectedRule(rule);
    setRuleFormOpen(true);
  };

  const handleSaveRule = async (data: any) => {
    try {
      const orgResult = await getOrganizationId();
      const orgId = orgResult.organizationId || "cmkirf3lj0000jhhexsx6p1e3";
      if (selectedRule) {
        await updateRule(selectedRule.id, data);
      } else {
        await createRule({ ...data, organizationId: orgId });
      }
      await loadRules();
      setRuleFormOpen(false);
      toast.success(selectedRule ? "Rule updated" : "Rule created", {
        position: "bottom-left",
      });
    } catch (error) {
      console.error("Error saving rule:", error);
      toast.error("Failed to save rule", {
        position: "bottom-left",
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    // Find the rule before deleting
    const ruleToDelete = rules.find((r) => r.id === ruleId);
    if (!ruleToDelete) return;

    // Store for potential undo
    const newDeletedRules = new Map(deletedRules);
    newDeletedRules.set(ruleId, ruleToDelete);
    setDeletedRules(newDeletedRules);

    // Remove from UI immediately
    setRules(rules.filter((r) => r.id !== ruleId));

    // Show undo toast
    showUndoDeleteToast({
      itemName: `Rule "${ruleToDelete.name}"`,
      onUndo: async () => {
        // Restore the rule
        setRules([...rules]);
        setDeletedRules((prev) => {
          const updated = new Map(prev);
          updated.delete(ruleId);
          return updated;
        });
        await loadRules();
      },
      duration: 5000,
    });

    // Actually delete after 5 seconds (if not undone)
    setTimeout(async () => {
      if (deletedRules.has(ruleId)) {
        await deleteRule(ruleId);
        setDeletedRules((prev) => {
          const updated = new Map(prev);
          updated.delete(ruleId);
          return updated;
        });
      }
    }, 5000);
  };

  const handleToggleStatus = async (ruleId: string) => {
    const result = await toggleRuleStatus(ruleId);
    if (result.success) {
      await loadRules();
    }
  };

  const handleActivateTemplate = () => {
    setTemplateLibraryOpen(true);
  };

  const handleReviewItem = (item: any) => {
    setSelectedReviewItem(item);
    setReviewPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Cancellation Rules Engine
        </h1>
        <p className="text-muted-foreground">
          Configure automation rules for cancellation request handling
        </p>
      </div>

      {/* Rules Dashboard */}
      <RulesDashboard
        rules={rules}
        onCreateRule={handleCreateRule}
        onEditRule={handleEditRule}
        onDeleteRule={handleDeleteRule}
        onToggleStatus={handleToggleStatus}
        onActivateTemplate={handleActivateTemplate}
      />

      {/* Review Queue */}
      {reviewQueue.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Manual Review Queue</h2>
            <p className="text-muted-foreground">
              Orders flagged for manual review
            </p>
          </div>
          <ReviewQueue items={reviewQueue} onReviewItem={handleReviewItem} />
        </div>
      )}

      {/* Modals */}
      <RuleForm
        open={ruleFormOpen}
        onOpenChange={setRuleFormOpen}
        rule={selectedRule}
        onSave={handleSaveRule}
      />

      <TemplateLibrary
        open={templateLibraryOpen}
        onOpenChange={setTemplateLibraryOpen}
        onSuccess={loadRules}
      />

      <OrderReviewPanel
        open={reviewPanelOpen}
        onOpenChange={setReviewPanelOpen}
        item={selectedReviewItem}
        currentUser={DEMO_USER}
        onSuccess={loadReviewQueue}
      />
    </div>
  );
}
