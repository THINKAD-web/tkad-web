import { Suspense } from "react";
import AdminReportNewClient from "./admin-report-new-client";

export const dynamic = "force-dynamic";

export default function AdminReportNewPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>
      }
    >
      <AdminReportNewClient />
    </Suspense>
  );
}
