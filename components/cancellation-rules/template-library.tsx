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
import { getOrganizationId } from "@/app/actions/organization";
import { toast } from "sonner";
import type { RuleTemplate } from "@/lib/types";

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string; // Optional, will be fetched if not provided
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
    try {
      const result = await getRuleTemplates();
      if (result.success && result.data) {
        setTemplates(result.data as RuleTemplate[]);
        
        // If still no templates after auto-seed attempt, try manual seed
        if (result.data.length === 0) {
          console.log("No templates found after auto-seed. Attempting manual seed...");
          try {
            const seedResponse = await fetch("/api/seed", { method: "POST" });
            if (seedResponse.ok) {
              const seedData = await seedResponse.json();
              console.log("Manual seed completed:", seedData);
              
              // Reload templates after seeding
              const retryResult = await getRuleTemplates();
              if (retryResult.success && retryResult.data) {
                setTemplates(retryResult.data as RuleTemplate[]);
                if (retryResult.data.length > 0) {
                  toast.success("Templates loaded successfully", {
                    position: "bottom-left",
                  });
                }
              }
            } else {
              const errorData = await seedResponse.json();
              console.error("Seed failed:", errorData);
              toast.error("Failed to load templates. Please try refreshing the page.", {
                position: "bottom-left",
              });
            }
          } catch (seedErr) {
            console.error("Error seeding templates:", seedErr);
            toast.error("Failed to load templates. Please try refreshing the page.", {
              position: "bottom-left",
            });
          }
        }
      } else {
        console.error("Failed to load templates:", result.error);
        toast.error(result.error || "Failed to load templates", {
          position: "bottom-left",
        });
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates", {
        position: "bottom-left",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (template: RuleTemplate) => {
    setActivating(template.id);
    // Get organization ID if not provided
    let orgId = organizationId;
    if (!orgId) {
      const orgResult = await getOrganizationId();
      orgId = orgResult.organizationId || "cmkirf3lj0000jhhexsx6p1e3";
    }
    const result = await activateTemplate(template.id, orgId);

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rule Templates</DialogTitle>
          <DialogDescription>
            Choose from pre-built templates to quickly set up automation rules
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No templates available</p>
            <p className="text-sm text-muted-foreground mb-4">
              Templates are being created automatically. Please refresh the page.
            </p>
            <Button onClick={loadTemplates} variant="outline">
              Retry Loading Templates
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                {template.recommended && (
                  <div className="absolute top-4 right-4">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="pr-8">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Category: </span>
                      <Badge variant="secondary">{template.category}</Badge>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Action: </span>
                      <Badge variant="outline">
                        {getActionLabel(template.actions)}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleActivate(template)}
                      disabled={activating === template.id}
                      className="w-full"
                      variant="default"
                    >
                      {activating === template.id ? (
                        "Activating..."
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Activate Template
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
