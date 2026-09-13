import { Suspense } from "react";
import RecommendPageClient from "./recommend-page-client";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";

/**
 * `force-dynamic` 였을 때는 매 요청마다 풀 SSR + CDN 엣지 캐시 무효화로
 * `/planner`(revalidate=3600, ISR) 대비 체감 로딩이 느렸다 (같은
 * fetchPublicMediaCatalogList()/fetchPlannerMediaCatalog() 데이터를 쓰면서
 * 캐싱 전략만 달랐음 — 이 페이지의 서버 컴포넌트는 cookies()/headers() 등
 * 동적 API를 전혀 안 써서 dynamic 을 강제할 이유가 없었다). `/planner`와
 * 동일한 ISR 전략으로 통일.
 */
export const revalidate = 3600;

export default async function RecommendPage() {
  const catalog = await fetchPublicMediaCatalogList();
  return (
    <Suspense fallback={null}>
      <RecommendPageClient catalog={catalog} />
    </Suspense>
  );
}
