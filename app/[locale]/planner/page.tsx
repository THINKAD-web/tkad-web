import PlannerPageClient from "./planner-page-client";
import { fetchPlannerMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 3600;

/**
 * 미디어 플래너: 서버에서 Prisma 활성 매체만 조회해 클라이언트에 전달합니다.
 * (`mediaData` 목업 미사용 — `lib/public-media-catalog.fetchPlannerMediaCatalog`)
 */
export default async function PlannerPage() {
  const { catalog, databaseEmpty } = await fetchPlannerMediaCatalog();
  return (
    <PlannerPageClient catalog={catalog} databaseEmpty={databaseEmpty} />
  );
}
