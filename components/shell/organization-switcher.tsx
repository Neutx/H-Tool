"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Building2, ChevronDown, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function OrganizationSwitcher() {
  const { activeOrganization, organizations, switchOrganization, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!activeOrganization || organizations.length === 0) {
    return null;
  }

  const handleSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    setOpen(false);
    router.refresh();
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      owner: { variant: "default", label: "Owner" },
      admin: { variant: "secondary", label: "Admin" },
      member: { variant: "outline", label: "Member" },
      viewer: { variant: "outline", label: "Viewer" },
    };
    return roleMap[role] || { variant: "outline" as const, label: role };
  };

  const currentMembership = user?.teamMemberships.find(
    (tm) => tm.organizationId === activeOrganization.id
  );
  const currentRole = currentMembership?.role || "member";
  const roleBadge = getRoleBadge(currentRole);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2"
      >
        <Building2 className="h-4 w-4" />
        <span className="hidden md:inline-block font-medium">
          {activeOrganization.name}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-lg border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                Organizations
              </div>
              {organizations.map((org) => {
                const membership = user?.teamMemberships.find(
                  (tm) => tm.organizationId === org.id
                );
                const role = membership?.role || "member";
                const orgRoleBadge = getRoleBadge(role);
                const isActive = org.id === activeOrganization.id;

                return (
                  <button
                    key={org.id}
                    onClick={() => !isActive && handleSwitch(org.id)}
                    className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">{org.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={orgRoleBadge.variant} className="text-xs">
                        {orgRoleBadge.label}
                      </Badge>
                      {isActive && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          ✓
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="border-t p-2 dark:border-slate-700">
              <Link
                href="/onboarding"
                onClick={() => setOpen(false)}
                className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Organization</span>
              </Link>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Settings className="h-4 w-4" />
                <span>Admin Settings</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
