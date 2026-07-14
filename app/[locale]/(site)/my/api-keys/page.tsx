import { Suspense } from "react";
import { MyApiKeysPageClient } from "@/components/my/my-api-keys-page-client";

export default function MyApiKeysPage() {
  return (
    <Suspense fallback={null}>
      <MyApiKeysPageClient />
    </Suspense>
  );
}
