import { Suspense } from "react";
import AdminAiContentEditClient from "./ai-content-edit-client";

export default function AdminAiContentEditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">불러오는 중…</div>
      }
    >
      <AdminAiContentEditClient />
    </Suspense>
  );
}
