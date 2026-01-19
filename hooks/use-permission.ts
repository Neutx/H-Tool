"use client";

import { useAuth } from "./use-auth";
import { hasPermission, type Permission } from "@/lib/rbac";

export function usePermission(permission: Permission): boolean {
  const { teamMembership } = useAuth();
  return hasPermission(teamMembership?.role, permission);
}
