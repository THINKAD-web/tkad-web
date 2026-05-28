import { Suspense } from "react";
import { MyPlanPageClient } from "@/components/my/my-plan-page-client";

export default function MyPlanPage() {
  return (
    <Suspense fallback={null}>
      <MyPlanPageClient />
    </Suspense>
  );
}
