"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { acceptInvite } from "@/app/actions/organization";
import { isInviteLink, signInWithInviteLink } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { InviteConfirmation } from "@/components/invite/invite-confirmation";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { user, firebaseUser, loading: authLoading, refetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteData, setInviteData] = useState<{
    organizationName: string;
    role: string;
    inviteEmail: string | null;
  } | null>(null);
  const [fetchingInvite, setFetchingInvite] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const inviteCode = params?.code as string;

  // Fetch invite details on mount
  useEffect(() => {
    if (!inviteCode || authLoading) return;

    const fetchInviteDetails = async () => {
      setFetchingInvite(true);
      try {
        const response = await fetch(`/api/invites/${inviteCode}`);
        if (response.ok) {
          const data = await response.json();
          setInviteData(data);
          
          // Pre-fill email if invite has one
          if (data.inviteEmail && !user) {
            setEmail(data.inviteEmail);
          }
        } else {
          const error = await response.json();
          toast.error(error.error || "Invalid invite link");
        }
      } catch (error) {
        console.error("Error fetching invite details:", error);
        toast.error("Failed to load invite details");
      } finally {
        setFetchingInvite(false);
      }
    };

    fetchInviteDetails();
  }, [inviteCode, authLoading]);

  // Show confirmation when user is logged in and invite data is loaded
  useEffect(() => {
    if (user && firebaseUser && inviteData && !fetchingInvite && !loading) {
      // Auto-accept invite if user is logged in and we have invite data
      // This handles the case where user logs in and comes back to this page
      if (!showConfirmation) {
        setShowConfirmation(true);
      }
    }
  }, [user, firebaseUser, inviteData, fetchingInvite, loading, showConfirmation]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    // Validate email matches invite email if specified
    if (inviteData?.inviteEmail && email.trim().toLowerCase() !== inviteData.inviteEmail.toLowerCase()) {
      toast.error(`This invitation was sent to ${inviteData.inviteEmail}. Please use that email address.`);
      return;
    }

    setLoading(true);
    try {
      // Check if this is a Firebase email link (user clicked link from email)
      if (isInviteLink()) {
        // User clicked the link from email, sign them in
        await signInWithInviteLink(email.trim());
        
        // Wait for auth to update
        await refetch();

        toast.success("Signed in successfully! Processing invite...");
        
        // Component will re-render and show confirmation
      } else {
        // Not a Firebase link, redirect to login with email pre-filled and invite code
        router.push(`/login?email=${encodeURIComponent(email.trim())}&invite=${inviteCode}`);
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast.error(error.message || "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!user || !inviteCode) return;

    setLoading(true);
    try {
      const result = await acceptInvite(inviteCode, user.id);

      if (result.success) {
        toast.success("Successfully joined organization!");
        // Wait for refetch to complete and ensure state is updated
        await refetch();
        // Small delay to ensure the user data is fully updated before redirect
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } else {
        toast.error(result.error || "Failed to accept invite");
        
        // Handle specific error cases
        if (result.error?.includes("expired")) {
          router.push("/login?error=invite_expired");
        } else if (result.error?.includes("already been used")) {
          router.push("/login?error=invite_used");
        } else if (result.error?.includes("already a member")) {
          // User is already a member, just redirect to dashboard
          await refetch();
          router.push("/dashboard");
        } else {
          // For other errors, stay on the page so user can see the error
          // Don't redirect
        }
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.error("An error occurred while accepting invite");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || fetchingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show confirmation if user is logged in and we have invite data
  if (showConfirmation && user && firebaseUser && inviteData) {
    return (
      <InviteConfirmation
        inviteCode={inviteCode}
        userEmail={user.email}
        inviteData={inviteData}
        onConfirm={handleAcceptInvite}
        onCancel={() => router.push("/dashboard")}
        loading={loading}
      />
    );
  }

  // Show email input if not logged in
  // If invite has email, auto-redirect to login
  useEffect(() => {
    // Only redirect if user is not logged in, we have invite data with email, and we're not showing confirmation
    if (!authLoading && !user && inviteData?.inviteEmail && !showConfirmation && !loading) {
      router.push(`/login?email=${encodeURIComponent(inviteData.inviteEmail)}&invite=${inviteCode}`);
    }
  }, [authLoading, user, inviteData, inviteCode, router, showConfirmation, loading]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Accept Invitation</CardTitle>
          <CardDescription>
            {inviteData?.inviteEmail 
              ? `This invitation was sent to ${inviteData.inviteEmail}. Redirecting to sign in...`
              : "Enter your email to continue with the invitation"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteData?.inviteEmail ? (
            <div className="text-center">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
              <p className="text-sm text-muted-foreground">
                Redirecting to sign in with Google...
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to sign in with Google to accept this invitation.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Processing..." : "Continue with Google Sign-In"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
