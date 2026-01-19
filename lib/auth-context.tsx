"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { syncUserToDatabaseWithData, getUserSession, setActiveOrganization as setActiveOrg } from "@/app/actions/auth";
import { getUserOrganizations } from "@/app/actions/organization";
import type { User, Organization, TeamMember } from "@prisma/client";

interface AuthContextValue {
  user: (User & { teamMemberships: TeamMember[] }) | null;
  firebaseUser: FirebaseUser | null;
  activeOrganization: (Organization & { teamMembers: TeamMember[] }) | null;
  organizations: Organization[];
  teamMembership: TeamMember | null;
  loading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<(User & { teamMemberships: TeamMember[] }) | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<(Organization & { teamMembers: TeamMember[] }) | null>(null);
  const [teamMembership, setTeamMembership] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (firebaseUid: string, firebaseUserData: FirebaseUser) => {
    try {
      // Sync Firebase user to database
      const syncResult = await syncUserToDatabaseWithData(
        firebaseUid,
        firebaseUserData.email || "",
        firebaseUserData.displayName || undefined,
        firebaseUserData.photoURL || undefined
      );
      if (!syncResult.success) {
        console.error("Failed to sync user:", syncResult.error);
        return;
      }

      // Get user from database
      const userData = syncResult.data;
      if (!userData) return;

      setUser(userData);

      // Get user's organizations
      const orgsResult = await getUserOrganizations(userData.id);
      if (orgsResult.success && orgsResult.data) {
        setOrganizations(orgsResult.data);
      }

      // Get user session to find active organization
      const sessionResult = await getUserSession(userData.id);
      if (sessionResult.success && sessionResult.data) {
        const session = sessionResult.data;
        const activeOrgId = session.activeOrganizationId;

        if (activeOrgId) {
          // Find the active organization
          const activeOrg = orgsResult.data?.find((org) => org.id === activeOrgId);
          if (activeOrg) {
            // Get team membership for this org
            const membership = userData.teamMemberships.find(
              (tm) => tm.organizationId === activeOrgId
            );
            setTeamMembership(membership || null);
            setActiveOrganization(activeOrg as Organization & { teamMembers: TeamMember[] });
          }
        } else if (orgsResult.data && orgsResult.data.length > 0) {
          // No active org set, but user has orgs - set the first one
          const firstOrg = orgsResult.data[0];
          await setActiveOrg(userData.id, firstOrg.id);
          const membership = userData.teamMemberships.find(
            (tm) => tm.organizationId === firstOrg.id
          );
          setTeamMembership(membership || null);
          setActiveOrganization(firstOrg as Organization & { teamMembers: TeamMember[] });
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        await loadUserData(firebaseUser.uid, firebaseUser);
      } else {
        setUser(null);
        setOrganizations([]);
        setActiveOrganization(null);
        setTeamMembership(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadUserData]);

  const switchOrganization = useCallback(async (orgId: string) => {
    if (!user) return;

    try {
      const result = await setActiveOrg(user.id, orgId);
      if (result.success) {
        const org = organizations.find((o) => o.id === orgId);
        if (org) {
          const membership = user.teamMemberships.find((tm) => tm.organizationId === orgId);
          setTeamMembership(membership || null);
          setActiveOrganization(org as Organization & { teamMembers: TeamMember[] });
        }
      }
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  }, [user, organizations]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setOrganizations([]);
      setActiveOrganization(null);
      setTeamMembership(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (firebaseUser) {
      await loadUserData(firebaseUser.uid, firebaseUser);
    }
  }, [firebaseUser, loadUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        activeOrganization,
        organizations,
        teamMembership,
        loading,
        switchOrganization,
        signOut,
        refetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
