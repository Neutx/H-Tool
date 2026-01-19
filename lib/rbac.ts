import { TeamMemberRole } from "@prisma/client";

export type Permission =
  | "*" // All permissions (owner only)
  | "organization.settings.view"
  | "organization.settings.edit"
  | "organization.delete"
  | "team.members.view"
  | "team.members.invite"
  | "team.members.edit"
  | "team.members.remove"
  | "rules.view"
  | "rules.create"
  | "rules.edit"
  | "rules.delete"
  | "refunds.view"
  | "refunds.process"
  | "inventory.view"
  | "inventory.edit"
  | "analytics.view"
  | "cancellation.view"
  | "cancellation.approve"
  | "cancellation.deny";

const PERMISSIONS: Record<TeamMemberRole, Permission[]> = {
  [TeamMemberRole.owner]: ["*"], // Owner has all permissions
  [TeamMemberRole.admin]: [
    "organization.settings.view",
    "organization.settings.edit",
    "team.members.view",
    "team.members.invite",
    "team.members.edit",
    "team.members.remove",
    "rules.view",
    "rules.create",
    "rules.edit",
    "rules.delete",
    "refunds.view",
    "refunds.process",
    "inventory.view",
    "inventory.edit",
    "analytics.view",
    "cancellation.view",
    "cancellation.approve",
    "cancellation.deny",
  ],
  [TeamMemberRole.member]: [
    "rules.view",
    "refunds.view",
    "inventory.view",
    "analytics.view",
    "cancellation.view",
  ],
  [TeamMemberRole.viewer]: [
    "rules.view",
    "refunds.view",
    "inventory.view",
    "analytics.view",
    "cancellation.view",
  ],
};

export function hasPermission(role: TeamMemberRole | string | null | undefined, permission: Permission): boolean {
  if (!role) return false;

  const rolePermissions = PERMISSIONS[role as TeamMemberRole];
  if (!rolePermissions) return false;

  // Owner has all permissions
  if (rolePermissions.includes("*")) return true;

  // Check if role has the specific permission
  return rolePermissions.includes(permission);
}

export function usePermission(permission: Permission) {
  // This will be used in components with useAuth hook
  // For now, return a function that can be called with role
  return (role: TeamMemberRole | string | null | undefined) => hasPermission(role, permission);
}
