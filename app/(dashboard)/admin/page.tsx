import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | H-Tool",
  description: "Manage users and organization settings",
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage team members, roles, and organization settings
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          Admin IAM System will be implemented here
        </p>
      </div>
    </div>
  );
}

