"use client";

import { useState, useEffect } from "react";
import { RulesDashboard } from "@/components/cancellation-rules/rules-dashboard";
import { RuleForm } from "@/components/cancellation-rules/rule-form";
import { TemplateLibrary } from "@/components/cancellation-rules/template-library";
import { ReviewQueue } from "@/components/cancellation-rules/review-queue";
import { OrderReviewPanel } from "@/components/cancellation-rules/order-review-panel";
import { getRules, deleteRule, toggleRuleStatus, createRule, updateRule } from "@/app/actions/rules";
import { getReviewQueueItems } from "@/app/actions/review-queue";
import { showUndoDeleteToast } from "@/lib/undo-delete";
import { useOrganization, useAuth } from "@/hooks/use-auth";
import type { Rule, ReviewQueueItem, CreateRuleFormData } from "@/lib/types";

export default function CancellationRulesPage() {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const organizationId = organization?.id;
  const [rules, setRules] = useState<Rule[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [ruleFormOpen, setRuleFormOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);

  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState<ReviewQueueItem | null>(null);

  const [deletedRules, setDeletedRules] = useState<Map<string, Rule>>(new Map());

  const loadRules = async () => {
    if (!organizationId) return;
    const result = await getRules(organizationId);
    if (result.success && result.data) {
      setRules(result.data as Rule[]);
    }
  };

  const loadReviewQueue = async () => {
    if (!organizationId) return;
    const result = await getReviewQueueItems(organizationId);
    if (result.success && result.data) {
      setReviewQueue(result.data as ReviewQueueItem[]);
    }
  };

  const loadData = async () => {
    if (!organizationId) return;
    setLoading(true);
    await Promise.all([loadRules(), loadReviewQueue()]);
    setLoading(false);
  };

  // Fetch data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);


  const handleCreateRule = () => {
    setSelectedRule(null);
    setRuleFormOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setSelectedRule(rule);
    setRuleFormOpen(true);
  };

  const handleSaveRule = async (data: CreateRuleFormData) => {
    if (selectedRule) {
      await updateRule(selectedRule.id, data);
    } else {
      if (!organizationId) return;
      await createRule({ ...data, organizationId });
    }
    await loadRules();
    setRuleFormOpen(false);
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

  const handleReviewItem = (item: ReviewQueueItem) => {
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

      {organizationId && (
        <TemplateLibrary
          open={templateLibraryOpen}
          onOpenChange={setTemplateLibraryOpen}
          organizationId={organizationId}
          onSuccess={loadRules}
        />
      )}

      <OrderReviewPanel
        open={reviewPanelOpen}
        onOpenChange={setReviewPanelOpen}
        item={selectedReviewItem}
        currentUser={user?.name || user?.email || "User"}
        onSuccess={loadReviewQueue}
      />
    </div>
  );
}
