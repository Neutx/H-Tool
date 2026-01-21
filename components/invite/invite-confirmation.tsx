"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface InviteConfirmationProps {
  inviteCode: string;
  userEmail: string;
  inviteData: {
    organizationName: string;
    role: string;
    inviteEmail: string | null;
  };
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

export function InviteConfirmation({
  inviteCode,
  userEmail,
  inviteData,
  onConfirm,
  onCancel,
  loading,
}: InviteConfirmationProps) {

  const emailMismatch = Boolean(
    inviteData.inviteEmail && inviteData.inviteEmail.toLowerCase() !== userEmail.toLowerCase()
  );
  const roleDisplay = inviteData.role.charAt(0).toUpperCase() + inviteData.role.slice(1);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Join Organization</CardTitle>
          <CardDescription>
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailMismatch && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This invitation was sent to <strong>{inviteData.inviteEmail}</strong>, but you're signed in as <strong>{userEmail}</strong>. 
                Please sign in with the invited email address to accept this invitation.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 rounded-lg border p-4">
            <div>
              <p className="text-sm text-muted-foreground">Organization</p>
              <p className="text-lg font-semibold">{inviteData.organizationName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="secondary" className="mt-1">
                {roleDisplay}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Email</p>
              <p className="text-sm font-medium">{userEmail}</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
              disabled={loading || emailMismatch}
            >
              {loading ? "Joining..." : "Join Organization"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
