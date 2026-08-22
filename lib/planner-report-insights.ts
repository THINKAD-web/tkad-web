import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { plannerMonthlyPriceWonForMedia } from "@/lib/planner/planner-media-quantity";

export type GanttRow = {
  mediaId: string;
  name: string;
  startPct: number;
  widthPct: number;
  color: string;
};

export type BudgetRecommendation = {
  label: string;
  pct: number;
  reasonKo: string;
  reasonEn: string;
};

export type OnlineComparison = {
  naverCpmEfficiencyPct: number;
  instagramReachMultiplier: number;
  summaryKo: string;
  summaryEn: string;
};

export type BrandLiftEstimate = {
  pctMin: number;
  pctMax: number;
  industryKo: string;
  industryEn: string;
};

export type CompetitorExposureRow = {
  mediaName: string;
  industryKo: string;
  sharePct: number;
};

export type PlannerPremiumInsights = {
  gantt: GanttRow[];
  budgetRecs: BudgetRecommendation[];
  budgetSummaryKo: string;
  budgetSummaryEn: string;
  online: OnlineComparison;
  brandLift: BrandLiftEstimate;
  competitorExposure: CompetitorExposureRow[];
};

const GANTT_COLORS = ["#ff6200", "#1c1c1f", "#ec4899", "#6B7280", "#0ea5e9"];

const BRAND_LIFT_BY_GOAL: Record<
  PlannerCampaignGoal | "default",
  { min: number; max: number; ko: string; en: string }
> = {
  brand: { min: 8, max: 18, ko: "브랜드 인지", en: "Brand awareness" },
  launch: { min: 12, max: 25, ko: "신제품 론칭", en: "Product launch" },
  local: { min: 5, max: 12, ko: "지역 밀착", en: "Local reach" },
  sales: { min: 6, max: 14, ko: "매출·전환", en: "Sales" },
  event: { min: 10, max: 20, ko: "이벤트·팝업", en: "Event" },
  default: { min: 7, max: 15, ko: "일반 OOH", en: "General OOH" },
};

export function buildPlannerPremiumInsights(opts: {
  portfolio: MediaItem[];
  budgetMan: number;
  months: number;
  regionsText: string;
  goal: PlannerCampaignGoal | null;
  industryText?: string;
}): PlannerPremiumInsights | null {
  const { portfolio, budgetMan, months, regionsText, goal, industryText } = opts;
  if (portfolio.length === 0) return null;

  // A-1 Wave 3 — 지표와 예산 도넛을 각각 계산하던 두 경로를 하나로 합쳤다.
  // 이 함수는 pricing 을 받지 않아 수량이 항상 1 이고, 예산 도넛도
  // periodCtx 없이 월정가를 쓰고 있었다 (Wave 1 패널과 동일 조건).
  const plan = calculatePlan({
    media: portfolio.map((m) => ({
      media: m,
      itemNet: plannerMonthlyPriceWonForMedia(m),
    })),
    period: { kind: "months", months: months > 0 ? months : 1 },
    budgetWon: Math.max(0, budgetMan) * 10_000,
  });
  const advanced = {
    cpmKrw: plan.cpm.budgetWon,
    uniqueReach: plan.reach.value ?? 0,
  };

  const sliceWidth = 100 / portfolio.length;
  const gantt: GanttRow[] = portfolio.map((m, i) => ({
    mediaId: m.id,
    name: m.name,
    startPct: i * sliceWidth,
    widthPct: sliceWidth - 1,
    color: GANTT_COLORS[i % GANTT_COLORS.length] ?? "#ff6200",
  }));

  const budgetRecs: BudgetRecommendation[] = plan.breakdown.byCategory.map((s) => {
    const media = portfolio.find((m) => m.type === s.key);
    const region = media?.region ?? regionsText;
    return {
      label: s.labelKo,
      pct: s.budgetShare,
      reasonKo:
        s.budgetShare >= 35
          ? `${region} 핵심 동선 커버 — 타깃 도달 극대화`
          : "보조 채널 — 빈도·리마인드 보강",
      reasonEn:
        s.budgetShare >= 35
          ? `${region} core route coverage — maximize target reach`
          : "Support placement — frequency and reminder",
    };
  });

  const top = [...budgetRecs].sort((a, b) => b.pct - a.pct)[0];
  const second = [...budgetRecs].sort((a, b) => b.pct - a.pct)[1];
  const budgetSummaryKo = top && second
    ? `${top.label} ${top.pct}% + ${second.label} ${second.pct}% — 타깃 동선 커버리지 최적화`
    : "예산을 핵심 매체에 집중 배분";
  const budgetSummaryEn = top && second
    ? `${top.label} ${top.pct}% + ${second.label} ${second.pct}% — optimized route coverage`
    : "Concentrate budget on core placements";

  const oohCpm = advanced.cpmKrw ?? 4500;
  const naverCpm = 7200;
  const naverEff = Math.round(((naverCpm - oohCpm) / naverCpm) * 100);
  const instagramReachMult = Math.round((advanced.uniqueReach / Math.max(1, budgetMan * 800)) * 10) / 10;

  const online: OnlineComparison = {
    naverCpmEfficiencyPct: Math.max(0, naverEff),
    instagramReachMultiplier: Math.max(1.2, instagramReachMult),
    summaryKo: `동일 예산 대비 네이버 DA CPM ${Math.max(0, naverEff)}% 효율적 · 인스타그램 대비 도달 ${Math.max(1.2, instagramReachMult).toFixed(1)}배`,
    summaryEn: `OOH CPM ${Math.max(0, naverEff)}% more efficient vs Naver DA · ${Math.max(1.2, instagramReachMult).toFixed(1)}× Instagram reach`,
  };

  const liftKey = goal ?? "default";
  const lift = BRAND_LIFT_BY_GOAL[liftKey] ?? BRAND_LIFT_BY_GOAL.default;

  const competitorExposure: CompetitorExposureRow[] = portfolio.slice(0, 3).map((m, i) => ({
    mediaName: m.name,
    industryKo: industryText?.trim() || "동종 업계",
    sharePct: [42, 31, 27][i] ?? 20,
  }));

  return {
    gantt,
    budgetRecs,
    budgetSummaryKo,
    budgetSummaryEn,
    online,
    brandLift: {
      pctMin: lift.min,
      pctMax: lift.max,
      industryKo: lift.ko,
      industryEn: lift.en,
    },
    competitorExposure,
  };
}
