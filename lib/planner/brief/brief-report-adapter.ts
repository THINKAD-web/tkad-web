/**
 * PR-8-1 — 브리프 Step 3 → 보고서 export payload.
 *
 * `computePlannerMetrics` / `reachSplitForGoal` 호출 금지.
 * 숫자는 CampaignPlan 스냅샷 metrics + portfolio 기반 파생만 사용.
 */

import type { MediaItem } from "@/lib/media-data";
import type {
  CampaignPlanMediaLine,
  CampaignPlanSnapshot,
  CampaignPlanStoredMetrics,
} from "@/lib/campaign-plan-schema";
import {
  isEngineVersionCurrent,
  resolveStoredOverBudget,
} from "@/lib/campaign-plan-schema";
import type { SavedCampaignPlan } from "@/lib/campaign-plan-store";
import {
  budgetSplitByCategory,
  plannerReportCategoryKey,
  portfolioCpmByCategory,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import {
  briefAgeBandsToPlannerKeys,
  briefGoalToPlanner,
  briefIndustryToPlanner,
  type BriefChannelMode,
  type BriefGoal,
  type BriefIndustry,
} from "@/lib/planner/brief/brief-integrated-adapters";
import { summarizeSidoCodes } from "@/lib/planner/brief/regions";
import {
  flightDays,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import { getMediaPackageOptions } from "@/lib/media-quantity";
import { MEDIA_DAYS_PER_MONTH } from "@/lib/media-metrics";
import { plannerIndustryLabel } from "@/lib/planner/types";
import {
  EXPORT_DIGITAL_OMITTED_EN,
  EXPORT_DIGITAL_OMITTED_KO,
  exportReachPendingLine,
  exportRoiPendingLine,
} from "@/lib/planner-report-export/export-kpi";
import {
  metricBasisToExportBadge,
  type ExportKpiBadgeKey,
  type PlannerExportBadgeKind,
} from "@/lib/planner-report-export/export-badge";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import { buildExportBudgetHonesty } from "@/lib/planner/brief/over-budget-copy";

const GOAL_TITLES_KO: Record<PlannerCampaignGoal, string> = {
  brand: "브랜드 인지도",
  launch: "신제품 론칭",
  event: "이벤트·프로모션",
  sales: "전환·판매",
  local: "지역 마케팅",
};

const GOAL_TITLES_EN: Record<PlannerCampaignGoal, string> = {
  brand: "Brand awareness",
  launch: "Product launch",
  event: "Event promotion",
  sales: "Conversion",
  local: "Local marketing",
};

const BRIEF_GOAL_LABELS_KO: Record<string, string> = {
  awareness: "인지",
  consideration: "고려",
  conversion: "전환",
};

const BRIEF_GOAL_LABELS_EN: Record<string, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  conversion: "Conversion",
};

export type BriefReportPlan = SavedCampaignPlan | CampaignPlanSnapshot;

export type BuildBriefReportPayloadArgs = {
  plan: BriefReportPlan;
  catalog: readonly MediaItem[];
  isKo: boolean;
  /** O-1 live store — snapshot에 digital 없을 때 R-3 notice */
  channelMode?: BriefChannelMode;
  /** Phase 2/3: digital 스냅샷 존재 시 true → notice 생략 */
  hasDigitalSnapshot?: boolean;
  generatedAt?: string;
  /** 문의 자동 매칭 → 「문의 내용으로 자동 매칭된」 */
  mixSource?: "inquiry_match";
};

function isBriefGoal(v: string | undefined): v is BriefGoal {
  return v === "awareness" || v === "consideration" || v === "conversion";
}

function isBriefIndustry(v: string | undefined): v is BriefIndustry {
  return (
    v === "fb" ||
    v === "retail" ||
    v === "tech" ||
    v === "finance" ||
    v === "ent" ||
    v === "other"
  );
}

function briefFromPlan(plan: BriefReportPlan): CampaignBriefInput {
  const b = plan.brief;
  return {
    budgetInputWon: b.budgetWon,
    budgetMode: "total",
    regionCodes: b.regionCodes as CampaignBriefInput["regionCodes"],
    genders: b.genders ?? [],
    ageBands: (b.ageBands ?? []) as CampaignBriefInput["ageBands"],
    goal: isBriefGoal(b.goal) ? b.goal : null,
    industry: isBriefIndustry(b.industry) ? b.industry : null,
    flightStart: b.flightStart || null,
    flightEnd: b.flightEnd || null,
    freeText: b.freeText ?? "",
  };
}

export function resolveBriefPortfolio(
  plan: BriefReportPlan,
  catalog: readonly MediaItem[],
): MediaItem[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  return plan.mediaMix
    .map((line) => byId.get(line.mediaId))
    .filter((m): m is MediaItem => m != null);
}

export function briefMixQuantities(
  mediaMix: readonly CampaignPlanMediaLine[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of mediaMix) {
    if (line.units > 0) out[line.mediaId] = line.units;
  }
  return out;
}

/**
 * 매체별 저장 노출 (A-1b Wave 3) — 보고서가 저장 스냅샷을 정본으로 쓰게 한다.
 *
 * 라인 노출이 하나라도 비어 있으면 **전체를 포기한다.** 일부만 저장값을 쓰면
 * 집계 합이 저장 총계와도, 유도 총계와도 맞지 않는 제3의 값이 되기 때문이다.
 */
export function briefMixImpressions(
  mediaMix: readonly CampaignPlanMediaLine[],
): Record<string, number> | undefined {
  if (mediaMix.length === 0) return undefined;
  const out: Record<string, number> = {};
  for (const line of mediaMix) {
    if (!Number.isFinite(line.impressions) || line.impressions < 0) {
      return undefined;
    }
    out[line.mediaId] = line.impressions;
  }
  return out;
}

export function briefPriceOptionIndex(
  mediaMix: readonly CampaignPlanMediaLine[],
  catalog: readonly MediaItem[],
): Record<string, number> {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const out: Record<string, number> = {};
  for (const line of mediaMix) {
    if (!line.optionId) continue;
    const media = byId.get(line.mediaId);
    if (!media) continue;
    const options = getMediaPackageOptions(media);
    const idx = options.findIndex((o) => o.id === line.optionId);
    if (idx >= 0) out[line.mediaId] = idx;
  }
  return out;
}

/**
 * 저장 스냅샷이 이전 엔진 버전이면 안내 문구를 만든다 (A-1b Wave 3).
 *
 * **표시값은 바꾸지 않는다.** 보고서는 저장 시점 값을 그대로 보여주고,
 * 이 문구만 덧붙는다. 광고주에게 이미 나간 제안서의 숫자가 조용히
 * 바뀌는 것을 막으면서, 계산 로직이 그 사이 바뀌었다는 사실은 알린다.
 */
export function staleEngineNoticeFor(
  plan: BriefReportPlan,
  isKo: boolean,
): string | undefined {
  // 필드는 타입상 필수지만, 이 값이 생기기 전에 저장된 DB 행은 비어 있을 수 있다.
  const version = plan.engineVersion;
  if (typeof version !== "string" || version.length === 0) return undefined;
  if (isEngineVersionCurrent({ engineVersion: version })) return undefined;

  return isKo
    ? `이 제안서는 이전 계산 로직(${version}) 기준입니다. 저장 시점 값을 그대로 보여줍니다.`
    : `This proposal uses an earlier calculation engine (${version}). Figures are shown as saved.`;
}

/** 스냅샷 metrics → export용 impressions only (demo ROI/reach 금지) */
export function snapshotMetricsToExportMetrics(
  stored: CampaignPlanStoredMetrics,
  months: number,
): Pick<
  PlannerMetrics,
  "estimatedMonthlyImpressions" | "estimatedTotalImpressions"
> {
  const total = stored.totalImpressions;
  const monthly =
    months > 0 ? Math.round(total / months) : total;
  return {
    estimatedMonthlyImpressions: monthly,
    estimatedTotalImpressions: total,
  };
}

function inferBriefCategoriesText(
  portfolio: readonly MediaItem[],
  isKo: boolean,
): string {
  const keys = new Set<string>();
  for (const m of portfolio) {
    const key = plannerReportCategoryKey(m);
    if (key === "digital") keys.add(isKo ? "디지털" : "Digital");
    else if (key === "static") keys.add(isKo ? "고정형" : "Static");
    else if (key === "mobile") keys.add(isKo ? "이동형" : "Mobile");
  }
  return [...keys].join(", ") || (isKo ? "혼합" : "Mixed");
}

function briefAgeText(
  ageBands: readonly string[] | undefined,
  isKo: boolean,
): string {
  if (!ageBands?.length) return isKo ? "전 연령" : "All ages";
  return ageBands.join(", ");
}

function briefGoalTitle(
  brief: CampaignBriefInput,
  isKo: boolean,
): string {
  const plannerGoal = briefGoalToPlanner(brief.goal);
  if (brief.goal) {
    const custom = isKo
      ? BRIEF_GOAL_LABELS_KO[brief.goal]
      : BRIEF_GOAL_LABELS_EN[brief.goal];
    if (custom) {
      return isKo ? `${custom} 캠페인` : `${custom} campaign`;
    }
  }
  return isKo ? GOAL_TITLES_KO[plannerGoal] : GOAL_TITLES_EN[plannerGoal];
}

/**
 * 브리프 flight 일수 해소 — `months`(레거시 경로)와 `flight` 종류
 * (A-1b Wave 2, `calculatePlan` 직접 소비) 두 소비처가 공유한다.
 *
 * **반올림하지 않는다.** 예전에는 `Math.round(days / 30)` 이 21일을 1개월로
 * 올려, 보고서 머리말은 flight 날짜에서 "21일" 로 뜨는데 지표는 30일치로
 * 계산되는 상태를 만들었다 (21일 기준 총노출 43% 과대).
 *
 * 1개월의 정수배가 아닌 모든 기간이 영향을 받았다 — 7·14·21·45·365일 등.
 * 30·60·90일만 우연히 맞았다.
 *
 * 경계값(`Math.max(1, ...)` / `Math.min(12, ...)`) 제거만으로는 고쳐지지
 * 않는다. `Math.round(21/30)` 이 이미 1 을 내기 때문이다. 반올림 자체를
 * 없애야 한다.
 *
 * `days` 는 `mediaMix[0]?.days` 를 우선한다 — 저장 시점 라인값이 정본이라는
 * A-1b Wave 3 원칙과 같다. `flightMatchesStored` 는 그 값이 실제
 * `brief.flightStart/flightEnd` 에서 나온 게 맞는지 확인한다: 저장 시점에
 * flight 날짜가 없었으면 `mediaMix[0].days` 가 1로 저장되므로(#`build-plan-snapshot.ts`),
 * 이후 화면에 flight 날짜가 어쩌다 채워져 있어도 `flight` 종류를 쓰면 안 된다 —
 * 저장값(1일)과 달력 계산값이 어긋난다.
 */
function resolveBriefPeriodDays(plan: BriefReportPlan): {
  days: number;
  flightMatchesStored: boolean;
} {
  const brief = briefFromPlan(plan);
  const storedDays = plan.mediaMix[0]?.days;
  const flightDaysValue = flightDays(brief);
  const raw = storedDays ?? flightDaysValue ?? MEDIA_DAYS_PER_MONTH;
  const days = Number.isFinite(raw) && raw > 0 ? raw : MEDIA_DAYS_PER_MONTH;
  return {
    days,
    flightMatchesStored: flightDaysValue != null && flightDaysValue === days,
  };
}

function briefPeriodMonths(plan: BriefReportPlan): number {
  return resolveBriefPeriodDays(plan).days / MEDIA_DAYS_PER_MONTH;
}

function resolveDigitalOmittedNotice(
  args: BuildBriefReportPayloadArgs,
): string | undefined {
  if (args.channelMode !== "ooh_digital") return undefined;
  if (args.hasDigitalSnapshot) return undefined;
  return args.isKo ? EXPORT_DIGITAL_OMITTED_KO : EXPORT_DIGITAL_OMITTED_EN;
}

function buildBriefKpiBadges(
  plan: BriefReportPlan,
): Partial<Record<ExportKpiBadgeKey, PlannerExportBadgeKind>> {
  const dq = plan.metrics.dataQuality;
  const badges: Partial<Record<ExportKpiBadgeKey, PlannerExportBadgeKind>> = {
    impressions: metricBasisToExportBadge(dq.totalImpressions),
    reach: "pending",
    roi: "pending",
  };
  if (plan.metrics.mixCpmWon != null && dq.mixCpmWon != null) {
    badges.cpm = metricBasisToExportBadge(dq.mixCpmWon);
  }
  return badges;
}

function buildEffectSummaryLines(args: {
  isKo: boolean;
  metrics: Pick<
    PlannerMetrics,
    "estimatedMonthlyImpressions" | "estimatedTotalImpressions"
  >;
  blendedCpmKrw: number | null;
}): string[] {
  const fmt = (n: number) =>
    n.toLocaleString(args.isKo ? "ko-KR" : "en-US");
  const lines: string[] = [
    args.isKo
      ? `월 예상 노출 ${fmt(args.metrics.estimatedMonthlyImpressions)}회`
      : `Est. monthly impressions ${fmt(args.metrics.estimatedMonthlyImpressions)}`,
    args.isKo
      ? `총 예상 노출 ${fmt(args.metrics.estimatedTotalImpressions)}회`
      : `Est. total impressions ${fmt(args.metrics.estimatedTotalImpressions)}`,
    exportReachPendingLine(args.isKo),
  ];
  if (args.blendedCpmKrw != null && args.blendedCpmKrw > 0) {
    lines.push(
      args.isKo
        ? `블렌디드 CPM ₩${fmt(args.blendedCpmKrw)}`
        : `Blended CPM ₩${fmt(args.blendedCpmKrw)}`,
    );
  }
  lines.push(exportRoiPendingLine(args.isKo));
  return lines;
}

export function buildBriefReportPayload(
  args: BuildBriefReportPayloadArgs,
): PlannerReportExportPayload {
  const { plan, catalog, isKo } = args;
  const brief = briefFromPlan(plan);
  const portfolio = resolveBriefPortfolio(plan, catalog);
  const quantities = briefMixQuantities(plan.mediaMix);
  const priceOptionIndex = briefPriceOptionIndex(plan.mediaMix, catalog);
  const pricing = { quantities, priceOptionIndex };
  const resolvedPeriod = resolveBriefPeriodDays(plan);
  const months = resolvedPeriod.days / MEDIA_DAYS_PER_MONTH;
  const periodCtx = months > 0 ? { months } : undefined;
  const useFlightPeriod =
    resolvedPeriod.flightMatchesStored &&
    !!brief.flightStart &&
    !!brief.flightEnd;
  const budgetMan = Math.max(0, Math.round(plan.brief.budgetWon / 10_000));
  const campaignGoal = briefGoalToPlanner(brief.goal);
  const industryKey = briefIndustryToPlanner(brief.industry);
  const exportMetrics = snapshotMetricsToExportMetrics(plan.metrics, months);

  const budgetAllocation = budgetSplitByCategory(
    portfolio,
    pricing,
    periodCtx,
  ).map((s) => ({
    key: s.key,
    label: isKo ? s.labelKo : s.labelEn,
    pct: s.pct,
    valueWon: s.value,
    actualWon: s.actualWon,
  }));

  const cpmBars = portfolioCpmByCategory(portfolio, pricing, periodCtx).map(
    (p) => ({
      key: p.key,
      label: isKo ? p.labelKo : p.labelEn,
      value: p.cpm,
    }),
  );

  const blendedCpmKrw = plan.metrics.mixCpmWon;

  const { overBudgetWon, budgetUsedRate } = resolveStoredOverBudget(
    plan.metrics,
    plan.brief.budgetWon,
  );
  const budgetHonesty = buildExportBudgetHonesty({
    requestWon: plan.brief.budgetWon,
    mixWon: plan.metrics.totalCostWon,
    overBudgetWon,
    budgetUsedRate,
    isKo,
  });

  const days = flightDays(brief);
  const periodDisplay =
    brief.flightStart && brief.flightEnd
      ? days != null
        ? isKo
          ? `${brief.flightStart} ~ ${brief.flightEnd} (${days}일)`
          : `${brief.flightStart} ~ ${brief.flightEnd} (${days}d)`
        : `${brief.flightStart} ~ ${brief.flightEnd}`
      : isKo
        ? `${months}개월`
        : `${months} month${months > 1 ? "s" : ""}`;

  const digitalOmittedNotice = resolveDigitalOmittedNotice(args);

  return buildOohReportPayload({
    isKo,
    goalTitle: briefGoalTitle(brief, isKo),
    budgetMan,
    periodDisplay,
    regionsText: summarizeSidoCodes(brief.regionCodes, isKo),
    categoriesText: inferBriefCategoriesText(portfolio, isKo),
    ageText: briefAgeText(plan.brief.ageBands, isKo),
    industryText: plannerIndustryLabel(industryKey, isKo),
    industryKey,
    campaignGoal,
    portfolio,
    metrics: exportMetrics as PlannerMetrics,
    blendedCpmKrw,
    budgetAllocation,
    cpmBars,
    effectSummaryLines: buildEffectSummaryLines({
      isKo,
      metrics: exportMetrics,
      blendedCpmKrw,
    }),
    generatedAt:
      args.generatedAt ??
      new Date().toLocaleString(isKo ? "ko-KR" : "en-US"),
    months,
    flightStart: useFlightPeriod ? brief.flightStart : undefined,
    flightEnd: useFlightPeriod ? brief.flightEnd : undefined,
    campaignMediaQuantities: quantities,
    campaignMediaPriceOptionIndex: priceOptionIndex,
    campaignMediaImpressions: briefMixImpressions(plan.mediaMix),
    staleEngineNotice: staleEngineNoticeFor(plan, isKo),
    digitalOmittedNotice,
    kpiBadges: buildBriefKpiBadges(plan),
    mixSource: args.mixSource,
    budgetHonesty,
  });
}

/** CampaignPlan dataQuality → export badge (화면 DataQualityBadge 와 1:1) */
export { metricBasisToExportBadge };

/** PlannerReportSharedProps.narrativeContext 용 (선택) */
export function briefNarrativeAgeKeys(plan: BriefReportPlan) {
  const brief = briefFromPlan(plan);
  return briefAgeBandsToPlannerKeys(brief.ageBands);
}
