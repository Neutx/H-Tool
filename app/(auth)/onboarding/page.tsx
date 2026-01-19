"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { createOrganization, acceptInvite } from "@/app/actions/organization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refetch } = useAuth();
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);

  // Create organization form state
  const [orgName, setOrgName] = useState("");
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState("");

  // Join organization form state
  const [inviteCode, setInviteCode] = useState("");

  if (!user) {
    return null;
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast.error("Organization name is required");
      return;
    }

    setLoading(true);
    try {
      const result = await createOrganization(
        {
          name: orgName.trim(),
          shopifyStoreUrl: shopifyStoreUrl.trim() || undefined,
        },
        user.id
      );

      if (result.success) {
        toast.success("Organization created successfully!");
        await refetch();
        router.push("/dashboard");
      } else {
        toast.error(result.error || "Failed to create organization");
      }
    } catch (error) {
      toast.error("An error occurred while creating organization");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Invite code is required");
      return;
    }

    setLoading(true);
    try {
      const result = await acceptInvite(inviteCode.trim(), user.id);

      if (result.success) {
        toast.success("Successfully joined organization!");
        await refetch();
        router.push("/dashboard");
      } else {
        toast.error(result.error || "Failed to join organization");
      }
    } catch (error) {
      toast.error("An error occurred while joining organization");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Get Started</CardTitle>
          <CardDescription>
            Create a new organization or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Organization</TabsTrigger>
              <TabsTrigger value="join">Join Organization</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    placeholder="My Store"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopifyStoreUrl">Shopify Store URL (Optional)</Label>
                  <Input
                    id="shopifyStoreUrl"
                    placeholder="your-store.myshopify.com"
                    value={shopifyStoreUrl}
                    onChange={(e) => setShopifyStoreUrl(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Organization"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 mt-4">
              <form onSubmit={handleJoinOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the invite code provided by your organization administrator
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Joining..." : "Join Organization"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
