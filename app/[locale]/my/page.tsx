import { Suspense } from "react";
import { MyHubPageClient } from "@/components/my/my-hub-page-client";

export default function MyPage() {
  return (
    <Suspense fallback={null}>
      <MyHubPageClient />
    </Suspense>
  );
}
