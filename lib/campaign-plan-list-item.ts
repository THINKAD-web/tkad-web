import type {
  CampaignPlanBrief,
  CampaignPlanMixEntry,
  CampaignPlanOnlineRecommendSnapshot,
} from "@/lib/campaign-plan-schema";
import type { PlannerReportCopyState } from "@/lib/planner-report-export/report-copy-state";

const GOAL_TITLES_KO: Record<string, string> = {
  brand: "브랜드 인지도",
  launch: "신제품 론칭",
  event: "이벤트·프로모션",
  sales: "전환·판매",
  local: "지역 마케팅",
};

const GOAL_TITLES_EN: Record<string, string> = {
  brand: "Brand awareness",
  launch: "Product launch",
  event: "Event promotion",
  sales: "Conversion",
  local: "Local marketing",
};

export type CampaignPlanListItem = {
  id: string;
  title: string;
  goalTitle: string | null;
  regionsText: string | null;
  mediaCount: number;
  totalCostWon: number;
  budgetWon: number;
  flightStart: string;
  flightEnd: string;
  createdAt: string;
  expiresAt: string | null;
  engineVersion: string;
};

export function resolveCampaignPlanGoalTitle(
  goal: string | undefined,
  isKo: boolean,
): string | null {
  if (!goal) return null;
  const map = isKo ? GOAL_TITLES_KO : GOAL_TITLES_EN;
  return map[goal] ?? goal;
}

export function resolveCampaignPlanRegionsText(brief: CampaignPlanBrief): string | null {
  if (!brief.regionCodes?.length) return null;
  return brief.regionCodes.slice(0, 8).join(", ");
}

export function resolveCampaignPlanListTitle(params: {
  brief: CampaignPlanBrief;
  reportCopy: PlannerReportCopyState | null;
  isKo: boolean;
  createdAt: string;
}): string {
  const doc = params.reportCopy?.documentTitle?.trim();
  if (doc) return doc;
  const client = params.reportCopy?.clientName?.trim();
  if (client) return client;
  const goal = resolveCampaignPlanGoalTitle(params.brief.goal, params.isKo);
  if (goal) return goal;
  const d = new Date(params.createdAt);
  const label = d.toLocaleDateString(params.isKo ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return params.isKo ? `저장 플랜 · ${label}` : `Saved plan · ${label}`;
}

export function countCampaignPlanMedia(
  mediaMix: CampaignPlanMixEntry[],
  onlineRecommend: CampaignPlanOnlineRecommendSnapshot | null,
): number {
  if (mediaMix.length > 0) return mediaMix.length;
  return onlineRecommend?.channels?.length ?? 0;
}
