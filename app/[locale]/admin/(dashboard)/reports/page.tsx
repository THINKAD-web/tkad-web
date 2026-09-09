import { Suspense } from "react";
import AdminReportsHubClient from "@/components/admin/admin-reports-hub-client";

export const dynamic = "force-dynamic";

export default function AdminReportsHubPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>
      }
    >
      <AdminReportsHubClient />
    </Suspense>
  );
}
