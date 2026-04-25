import { Suspense } from "react";
import PlannerPageClient from "./planner-page-client";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 3600;

/**
 * 미디어 플래너: 서버에서 Prisma 활성 매체만 조회해 클라이언트에 전달합니다.
 * (`mediaData` 목업 미사용 — `lib/public-media-catalog.fetchPlannerMediaCatalog`)
 *
 * Suspense boundary: PlannerPageClient 내부 `useSearchParams()` 호출
 * (PR-D `?addMedia=` 쿼리 핸들러) 대응.
 */
export default async function PlannerPage() {
  const { catalog, databaseEmpty } = await fetchPlannerMediaCatalog();
  return (
    <Suspense fallback={null}>
      <PlannerPageClient catalog={catalog} databaseEmpty={databaseEmpty} />
    </Suspense>
  );
}
