"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthContext } from "@/lib/auth-context";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  return { user, loading };
}

export function useOrganization() {
  const { activeOrganization, teamMembership } = useAuth();
  return { organization: activeOrganization, membership: teamMembership };
}
