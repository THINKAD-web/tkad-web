import { fetchPublicMediaCatalogCore } from "@/lib/public-media-catalog";
import {
  attachSeoulBenchmarksToPortfolioRows,
  seoulBenchmarkFootnote,
} from "@/lib/planner/seoul-media-benchmark";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { unstable_cache } from "next/cache";
import { PUBLIC_MEDIA_CATALOG_CACHE_TAG } from "@/lib/media-catalog-cache-tags";

const getBenchmarkCatalogCached = unstable_cache(
  async () => fetchPublicMediaCatalogCore(),
  ["seoul-benchmark-catalog"],
  { revalidate: 3600, tags: [PUBLIC_MEDIA_CATALOG_CACHE_TAG] },
);

/** OOH export — portfolio 벤치마크 라벨 + 각주 (PDF/PPTX 서버 export). */
export async function enrichPlannerExportPayloadWithSeoulBenchmarks(
  payload: PlannerReportExportPayload,
): Promise<PlannerReportExportPayload> {
  if (payload.kind !== "ooh") return payload;
  if (!payload.portfolio?.length) return payload;

  const already = payload.portfolio.some(
    (r) => r.cpmBenchmarkLabel || r.footfallBenchmarkLabel,
  );
  if (already) {
    return payload.seoulBenchmarkFootnote
      ? payload
      : {
          ...payload,
          seoulBenchmarkFootnote: seoulBenchmarkFootnote(payload.isKo),
        };
  }

  const catalog = await getBenchmarkCatalogCached();
  const planCpms = payload._benchmarkPlanCpms;
  if (!planCpms?.length) return payload;

  const portfolio = attachSeoulBenchmarksToPortfolioRows({
    portfolioRows: payload.portfolio,
    catalog,
    planItems: planCpms,
    isKo: payload.isKo,
  });

  return {
    ...payload,
    portfolio,
    seoulBenchmarkFootnote: seoulBenchmarkFootnote(payload.isKo),
  };
}
