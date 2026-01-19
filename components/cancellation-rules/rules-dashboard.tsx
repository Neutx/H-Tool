"use client";

import { useState } from "react";
import {
  Settings,
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Rule, RuleActions } from "@/lib/types";
import { Prisma } from "@prisma/client";

interface RulesDashboardProps {
  rules: Rule[];
  onCreateRule: () => void;
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleStatus: (ruleId: string) => void;
  onActivateTemplate: () => void;
}

export function RulesDashboard({
  rules,
  onCreateRule,
  onEditRule,
  onDeleteRule,
  onToggleStatus,
  onActivateTemplate,
}: RulesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter rules
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && rule.active) ||
      (filterStatus === "inactive" && !rule.active);

    return matchesSearch && matchesStatus;
  });

  const getActionLabel = (actions: RuleActions | Prisma.JsonValue): string => {
    const actionsObj = actions as RuleActions;
    if (!actionsObj || !actionsObj.type) return "Unknown";
    const actionMap: Record<string, string> = {
      auto_approve: "Auto-approve",
      manual_review: "Manual review",
      deny: "Deny",
      escalate: "Escalate",
    };
    return actionMap[actionsObj.type] || actionsObj.type;
  };

  const getActionColor = (actions: RuleActions | Prisma.JsonValue): "success" | "warning" | "error" | "secondary" => {
    const actionsObj = actions as RuleActions;
    if (!actionsObj || !actionsObj.type) return "secondary";
    const colorMap: Record<string, "success" | "warning" | "error" | "secondary"> = {
      auto_approve: "success",
      manual_review: "warning",
      deny: "error",
      escalate: "warning",
    };
    return colorMap[actionsObj.type] || "secondary";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automation Rules</h2>
          <p className="text-muted-foreground">
            Configure rules to automatically handle cancellation requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onActivateTemplate} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Templates
          </Button>
          <Button onClick={onCreateRule}>
            <Plus className="mr-2 h-4 w-4" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("active")}
            >
              Active
            </Button>
            <Button
              variant={filterStatus === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("inactive")}
            >
              Inactive
            </Button>
          </div>
        </div>
      </Card>

      {/* Rules Table */}
      {filteredRules.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery || filterStatus !== "all"
              ? "No rules match your filters"
              : "No automation rules yet"}
          </p>
          {!searchQuery && filterStatus === "all" && (
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={onActivateTemplate} variant="outline">
                Browse Templates
              </Button>
              <Button onClick={onCreateRule}>Create Rule</Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Rule Header */}
                  <div className="flex items-start gap-3">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={() => onToggleStatus(rule.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{rule.name}</h3>
                        {rule.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {rule.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rule Details */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="font-medium">Action:</span>{" "}
                      <Badge variant={getActionColor(rule.actions)}>
                        {getActionLabel(rule.actions)}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Priority:</span>{" "}
                      <span className="text-muted-foreground">{rule.priority}</span>
                    </div>
                    <div>
                      <span className="font-medium">Used:</span>{" "}
                      <span className="text-muted-foreground">
                        {rule.usageCount} time{rule.usageCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Last modified:</span>{" "}
                      <span className="text-muted-foreground">
                        {formatDate(rule.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setOpenMenuId(openMenuId === rule.id ? null : rule.id)
                    }
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>

                  {openMenuId === rule.id && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onEditRule(rule);
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement duplicate
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Copy className="h-4 w-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={() => {
                            onDeleteRule(rule.id);
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

