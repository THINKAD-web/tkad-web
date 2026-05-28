import { Suspense } from "react";
import AdminContentEditClient from "./content-edit-client";

export default function AdminContentEditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">불러오는 중…</div>
      }
    >
      <AdminContentEditClient />
    </Suspense>
  );
}
