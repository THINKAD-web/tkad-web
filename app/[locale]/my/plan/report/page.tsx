import { Suspense } from "react";
import { MyPlanReportPageClient } from "@/components/my/my-plan-report-page-client";

export default function MyPlanReportPage() {
  return (
    <Suspense fallback={null}>
      <MyPlanReportPageClient />
    </Suspense>
  );
}
