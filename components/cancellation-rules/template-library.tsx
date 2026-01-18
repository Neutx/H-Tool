"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import { getRuleTemplates, activateTemplate } from "@/app/actions/rules";
import { toast } from "sonner";
import type { RuleTemplate } from "@/lib/types";

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess: () => void;
}

export function TemplateLibrary({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    setLoading(true);
    const result = await getRuleTemplates();
    if (result.success && result.data) {
      setTemplates(result.data as RuleTemplate[]);
    }
    setLoading(false);
  };

  const handleActivate = async (template: RuleTemplate) => {
    setActivating(template.id);
    const result = await activateTemplate(template.id, organizationId);

    if (result.success) {
      toast.success(`Activated: ${template.name}`, {
        position: "bottom-left",
      });
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error("Failed to activate template", {
        position: "bottom-left",
      });
    }
    setActivating(null);
  };

  const getActionLabel = (actions: any): string => {
    const actionMap: Record<string, string> = {
      auto_approve: "Auto-approve",
      manual_review: "Manual review",
      deny: "Deny",
      escalate: "Escalate",
    };
    return actionMap[actions?.type] || "Unknown";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Rule Templates</DialogTitle>
          <DialogDescription>
            Choose from pre-built templates to quickly set up automation rules
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No templates available</p>
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.recommended && (
                          <Badge variant="warning" className="gap-1">
                            <Star className="h-3 w-3" />
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleActivate(template)}
                      disabled={activating !== null}
                      size="sm"
                    >
                      {activating === template.id ? (
                        "Activating..."
                      ) : (
                        <>
                          <Check className="mr-1 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="font-medium">Category:</span>{" "}
                      <Badge variant="secondary">{template.category}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Action:</span>{" "}
                      <Badge variant="secondary">
                        {getActionLabel(template.actions)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

