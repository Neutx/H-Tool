"use client";

import { useState, useEffect } from "react";
import { useAuth, useOrganization } from "@/hooks/use-auth";
import { usePermission } from "@/hooks/use-permission";
import {
  getTeamMembers,
  createInvite,
  updateMemberRole,
  removeTeamMember,
  getOrganizationInvites,
  deleteInvite,
  updateOrganization,
} from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Copy, Trash2, UserPlus, Users, Settings, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { TeamMemberRole } from "@prisma/client";
import type { TeamMember, OrganizationInvite } from "@prisma/client";

export default function AdminPage() {
  const { user, activeOrganization } = useAuth();
  const { organization } = useOrganization();
  const canManageTeam = usePermission("team.members.invite");
  const canEditOrg = usePermission("organization.settings.edit");

  const [activeTab, setActiveTab] = useState("team");
  const [teamMembers, setTeamMembers] = useState<(TeamMember & { user: { id: string; name: string | null; email: string; avatar: string | null } })[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>(TeamMemberRole.member);
  const [inviteExpiresIn, setInviteExpiresIn] = useState(7);

  // Organization form state
  const [orgName, setOrgName] = useState("");
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState("");

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setShopifyStoreUrl(organization.shopifyStoreUrl || "");
    }
  }, [organization]);

  useEffect(() => {
    if (activeOrganization) {
      loadTeamData();
    }
  }, [activeOrganization]);

  const loadTeamData = async () => {
    if (!activeOrganization) return;
    setLoading(true);
    try {
      const [membersResult, invitesResult] = await Promise.all([
        getTeamMembers(activeOrganization.id),
        getOrganizationInvites(activeOrganization.id),
      ]);

      if (membersResult.success && membersResult.data) {
        setTeamMembers(membersResult.data);
      }
      if (invitesResult.success && invitesResult.data) {
        setInvites(invitesResult.data);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganization || !user) return;

    try {
      const result = await createInvite(
        activeOrganization.id,
        inviteRole,
        user.id,
        inviteEmail || undefined,
        inviteExpiresIn
      );

      if (result.success && result.data) {
        toast.success("Invite created successfully!");
        setInviteEmail("");
        setInviteRole(TeamMemberRole.member);
        await loadTeamData();
      } else {
        toast.error(result.error || "Failed to create invite");
      }
    } catch (error) {
      toast.error("An error occurred while creating invite");
      console.error(error);
    }
  };

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Invite code copied to clipboard!");
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!user) return;
    try {
      const result = await deleteInvite(inviteId, user.id);
      if (result.success) {
        toast.success("Invite deleted");
        await loadTeamData();
      } else {
        toast.error(result.error || "Failed to delete invite");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: TeamMemberRole) => {
    if (!user) return;
    try {
      const result = await updateMemberRole(memberId, newRole, user.id);
      if (result.success) {
        toast.success("Role updated successfully");
        await loadTeamData();
      } else {
        toast.error(result.error || "Failed to update role");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to remove this team member?")) return;

    try {
      const result = await removeTeamMember(memberId, user.id);
      if (result.success) {
        toast.success("Team member removed");
        await loadTeamData();
      } else {
        toast.error(result.error || "Failed to remove team member");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    }
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganization || !user) return;

    try {
      const result = await updateOrganization(
        activeOrganization.id,
        {
          name: orgName,
          shopifyStoreUrl: shopifyStoreUrl || undefined,
        },
        user.id
      );

      if (result.success) {
        toast.success("Organization updated successfully!");
      } else {
        toast.error(result.error || "Failed to update organization");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    }
  };

  const getRoleBadge = (role: TeamMemberRole) => {
    const roleMap: Record<TeamMemberRole, { variant: "default" | "secondary" | "outline"; label: string }> = {
      [TeamMemberRole.owner]: { variant: "default", label: "Owner" },
      [TeamMemberRole.admin]: { variant: "secondary", label: "Admin" },
      [TeamMemberRole.member]: { variant: "outline", label: "Member" },
      [TeamMemberRole.viewer]: { variant: "outline", label: "Viewer" },
    };
    return roleMap[role] || { variant: "outline" as const, label: role };
  };

  if (!activeOrganization) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage team members, roles, and organization settings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="organization">
            <Building2 className="mr-2 h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <LinkIcon className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6 mt-6">
          {/* Create Invite */}
          {canManageTeam && (
            <Card>
              <CardHeader>
                <CardTitle>Create Invite</CardTitle>
                <CardDescription>
                  Generate an invite code for new team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email (Optional)</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteRole">Role</Label>
                      <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamMemberRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TeamMemberRole.member}>Member</SelectItem>
                          <SelectItem value={TeamMemberRole.admin}>Admin</SelectItem>
                          <SelectItem value={TeamMemberRole.viewer}>Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteExpiresIn">Expires In (Days)</Label>
                      <Input
                        id="inviteExpiresIn"
                        type="number"
                        min="1"
                        max="30"
                        value={inviteExpiresIn}
                        onChange={(e) => setInviteExpiresIn(parseInt(e.target.value) || 7)}
                      />
                    </div>
                  </div>
                  <Button type="submit">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Invite
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Pending Invites */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Invites</CardTitle>
              <CardDescription>
                Invites that haven&apos;t been used yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : invites.length === 0 ? (
                <p className="text-muted-foreground">No pending invites</p>
              ) : (
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {invite.inviteCode}
                          </code>
                          <Badge variant={getRoleBadge(invite.role).variant}>
                            {getRoleBadge(invite.role).label}
                          </Badge>
                          {invite.email && (
                            <span className="text-sm text-muted-foreground">
                              {invite.email}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInviteCode(invite.inviteCode)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {canManageTeam && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage team member roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : teamMembers.length === 0 ? (
                <p className="text-muted-foreground">No team members</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member) => {
                    const roleBadge = getRoleBadge(member.role);
                    const canEdit = canManageTeam && member.role !== TeamMemberRole.owner;
                    const isCurrentUser = member.userId === user?.id;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-medium text-white">
                            {member.user.name?.[0]?.toUpperCase() || member.user.email[0]?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-medium">
                              {member.user.name || member.user.email}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.user.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {canEdit ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleUpdateRole(member.id, value as TeamMemberRole)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={TeamMemberRole.viewer}>Viewer</SelectItem>
                                <SelectItem value={TeamMemberRole.member}>Member</SelectItem>
                                <SelectItem value={TeamMemberRole.admin}>Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                          )}
                          {canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Update your organization details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canEditOrg ? (
                <form onSubmit={handleUpdateOrganization} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shopifyStoreUrl">Shopify Store URL</Label>
                    <Input
                      id="shopifyStoreUrl"
                      placeholder="your-store.myshopify.com"
                      value={shopifyStoreUrl}
                      onChange={(e) => setShopifyStoreUrl(e.target.value)}
                    />
                  </div>
                  <Button type="submit">
                    <Settings className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Organization Name</Label>
                    <p className="text-sm text-muted-foreground mt-1">{organization?.name}</p>
                  </div>
                  <div>
                    <Label>Shopify Store URL</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {organization?.shopifyStoreUrl || "Not set"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Manage your third-party integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Shopify</h3>
                      <p className="text-sm text-muted-foreground">
                        {organization?.shopifyStoreUrl || "Not configured"}
                      </p>
                    </div>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Unicommerce</h3>
                      <p className="text-sm text-muted-foreground">
                        Inventory management integration
                      </p>
                    </div>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
