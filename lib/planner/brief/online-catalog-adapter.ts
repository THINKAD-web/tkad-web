/**
 * O-1 / PART3-5 — 통합 브리프(`digital_only`) → recommendOnlineCatalogChannels() 어댑터.
 *
 * dmpilot API 브릿지(`ooh_digital`의 BriefDigitalPanel)와는 별개 경로 — 자체
 * 온라인 카탈로그(`Media.catalogChannel === "online"`)를 자체 스코어러로 추천한다.
 */

import type { MediaItem } from "@/lib/media-data";
import { canonicalCatalogChannel } from "@/lib/catalog-channel";
import {
  recommendOnlineCatalogChannels,
  type OnlineCatalogRecommendResult,
} from "@/lib/planner/recommend-online-catalog";
import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { briefBudgetMan, briefGoalToPlanner } from "@/lib/planner/brief/brief-integrated-adapters";

/** 카탈로그(OOH+온라인 혼재)에서 온라인 상품만 추출 — onlineSpec 없는 행은 스코어링 불가하므로 제외 */
export function onlineCatalogFromBrief(
  catalog: readonly MediaItem[],
): MediaItem[] {
  return catalog.filter(
    (m) =>
      canonicalCatalogChannel(m.catalogChannel) === "online" &&
      m.onlineSpec != null,
  );
}

export function recommendOnlineCatalogFromBrief(
  brief: CampaignBriefInput,
  catalog: readonly MediaItem[],
  isKo: boolean,
): OnlineCatalogRecommendResult {
  const onlineCatalog = onlineCatalogFromBrief(catalog);
  return recommendOnlineCatalogChannels(
    {
      goal: briefGoalToPlanner(brief.goal),
      industry: brief.industry,
      ageBands: brief.ageBands,
      genders: brief.genders,
      budgetMan: briefBudgetMan(brief),
      catalog: onlineCatalog,
    },
    isKo,
  );
}
