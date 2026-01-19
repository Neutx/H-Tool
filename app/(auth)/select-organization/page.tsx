"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";

export default function SelectOrganizationPage() {
  const router = useRouter();
  const { user, organizations, activeOrganization, switchOrganization: switchOrg } = useAuth();

  if (!user || organizations.length === 0) {
    return null;
  }

  const handleSwitch = async (orgId: string) => {
    await switchOrg(orgId);
    router.push("/dashboard");
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Select Organization</CardTitle>
          <CardDescription>
            Choose which organization you want to access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {organizations.map((org) => {
              const membership = user.teamMemberships.find((tm) => tm.organizationId === org.id);
              const role = membership?.role || "member";
              const roleBadge = getRoleBadge(role);
              const isActive = activeOrganization?.id === org.id;

              return (
                <div
                  key={org.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{org.name}</h3>
                        <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                        {isActive && (
                          <Badge variant="default" className="bg-emerald-600">
                            Active
                          </Badge>
                        )}
                      </div>
                      {org.shopifyStoreUrl && (
                        <p className="text-sm text-muted-foreground">{org.shopifyStoreUrl}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSwitch(org.id)}
                    variant={isActive ? "outline" : "default"}
                    disabled={isActive}
                  >
                    {isActive ? "Current" : "Switch"}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t pt-6">
            <Link href="/onboarding">
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create New Organization
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
