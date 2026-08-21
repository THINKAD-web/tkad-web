/**
 * CalcEngine (Phase A-1, STEP 3) — `calculatePlan` 단일 진입점.
 *
 * 이 파일이 캠페인 지표를 계산하는 **유일한** 곳이다.
 * 화면·PDF·저장 플랜은 `PlanResult` 를 읽기만 하고 재계산하지 않는다.
 *
 * 기준 정책 (A안 — STEP 2 리뷰 확정)
 *   노출은 현행 플래너 경로(`resolveImpressionsForUnits`)를 그대로 호출한다.
 *   `Media.impressions` 를 정본으로 삼을지는 A-4 에서 결정하며, 여기서는
 *   출처(`impressionsBasis`)만 기록하고 값이 어긋나면 경고를 남긴다.
 *   금액은 계산하지 않는다 — 호출자가 넘긴 `itemNet` 을 합산만 한다.
 */

import type { MediaItem } from "@/lib/media-data";
import {
  normalizeVisibilityScore,
  plannerBrowseCategoryKey,
  plannerBrowseCategoryLabels,
  plannerReportCategoryKey,
  plannerReportCategoryLabels,
} from "@/lib/planner-logic";
import { resolveImpressionsForUnits } from "@/lib/media-quantity";
import { partialRateLookupKeyFromDays } from "@/lib/media-partial-period-rates";
import { inclusiveCampaignDaysFromIso } from "@/lib/quote-campaign-days";
import {
  isValidRegionZoneId,
  mapDistrictToRegionZone,
  regionZoneLabel,
} from "@/lib/media-regions";
import {
  browseRegionLabel,
  getBrowseRegionSub,
  inferBrowseRegionFromMedia,
} from "@/lib/media-browse-regions";
import { isValidCatalogMediaType } from "@/lib/media-auto-categorize";
import {
  IMPRESSIONS_BASIS_CONFLICT_TOLERANCE,
  PLAN_DAYS_PER_MONTH,
  PLAN_ENGINE_VERSION,
  PLAN_WARNING_KIND,
  type CalcPlanInput,
  type PlanBreakdown,
  type PlanBudgetUsage,
  type PlanImpressionsBasis,
  type PlanMediaItem,
  type PlanMediaType,
  type PlanPeriod,
  type PlanPeriodInput,
  type PlanReach,
  type PlanRegionRef,
  type PlanResult,
  type PlanWarning,
  type Share,
} from "@/lib/planner/calc/types";

const DEFAULT_REGION_UNIQUE_FACTOR = 0.45;

/** 예산 대비 이 아래로 쓰면 저소진 경고 */
const BUDGET_UNDER_PCT = 70;
/** 예산 대비 이 위로 쓰면 초과 경고 */
const BUDGET_OVER_PCT = 100;

// ---------------------------------------------------------------------------
// 소도구
// ---------------------------------------------------------------------------

function round(n: number): number {
  return Math.round(n);
}

/** 비중 % — 소수 1자리. `sharePctOf` (planner-logic) 와 동일 규칙 */
function sharePct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function cpmOf(won: number, impressions: number): number | null {
  if (impressions <= 0 || won <= 0) return null;
  return Math.round(won / (impressions / 1000));
}

/**
 * 경고 생성 — `kind` 는 `PLAN_WARNING_KIND` 에서만 온다.
 * 호출부가 직접 지정하지 않으므로 코드와 성격이 어긋날 수 없다.
 */
function warn(w: Omit<PlanWarning, "kind">): PlanWarning {
  return { ...w, kind: PLAN_WARNING_KIND[w.code] };
}

// ---------------------------------------------------------------------------
// 기간
// ---------------------------------------------------------------------------

/**
 * 기간 입력 → 일수. **클램프하지 않는다.**
 * 21일을 1개월로 올림하던 기존 경로(regional-breakdown / region-subdivision /
 * brief adapters)가 노출을 1.4배 부풀린 원인이었다.
 */
function normalizePeriod(
  input: PlanPeriodInput,
  warnings: PlanWarning[],
): PlanPeriod {
  let days: number;
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (input.kind === "flight") {
    const fromRange = inclusiveCampaignDaysFromIso(input.startDate, input.endDate);
    if (fromRange == null) {
      days = 1;
      warnings.push(warn({
        code: "PERIOD_MISSING_FLIGHT_DATES",
        severity: "error",
        messageKo: "캠페인 시작·종료일을 해석할 수 없어 1일로 계산했습니다.",
        messageEn: "Could not parse the flight dates; calculated as 1 day.",
        context: { startDate: input.startDate, endDate: input.endDate },
      }));
    } else {
      days = fromRange;
      startDate = input.startDate;
      endDate = input.endDate;
    }
  } else if (input.kind === "days") {
    days = Math.max(1, Math.round(input.days));
  } else {
    days = Math.max(1, Math.round(input.months * PLAN_DAYS_PER_MONTH));
  }

  if (!startDate || !endDate) {
    warnings.push(warn({
      code: "PERIOD_MISSING_FLIGHT_DATES",
      severity: "info",
      messageKo: "시작·종료일이 없어 보고서에 기간을 일수로만 표기합니다.",
      messageEn: "No flight dates supplied; the report shows day count only.",
      context: { days },
    }));
  }

  const exactRateKey = partialRateLookupKeyFromDays(days);
  if (exactRateKey == null) {
    warnings.push(warn({
      code: "PERIOD_NO_EXACT_RATE_KEY",
      severity: "warn",
      messageKo: `캠페인 ${days}일은 운영 부분기간 요율 구간(1·3·5·7·15·30일)과 일치하지 않습니다. 금액이 선형 환산됐을 수 있습니다.`,
      messageEn: `A ${days}-day flight does not match an operational rate tier (1/3/5/7/15/30 days); pricing may have been prorated linearly.`,
      context: { days },
    }));
  }

  return {
    startDate,
    endDate,
    days,
    monthsEquivalent: days / PLAN_DAYS_PER_MONTH,
    source: input.kind,
    exactRateKey,
  };
}

// ---------------------------------------------------------------------------
// 노출 기준 해소
// ---------------------------------------------------------------------------

/**
 * 값은 현행 플래너 함수를 그대로 호출하고(A안 — 숫자 불변),
 * 어느 필드에서 나온 값인지만 별도로 판정한다.
 *
 * 판정 순서는 `baseMonthlyImpressions` (media-quantity.ts:289) 와 동일해야 한다.
 * 그 함수는 비공개라 우선순위를 여기서 재현하지만, **반환값은 재현하지 않고**
 * `resolveImpressionsForUnits` 결과를 쓴다.
 */
function resolveBasis(m: MediaItem): PlanImpressionsBasis {
  if (m.monthlyFootTraffic != null && m.monthlyFootTraffic > 0) {
    return "monthlyFootTraffic";
  }
  if (m.dailyFootTraffic != null && m.dailyFootTraffic > 0) {
    return "dailyDerived";
  }
  return "none";
}

/** `impressions` 와 `dailyFootTraffic × 30` 이 허용 오차를 넘게 어긋나는지 */
function detectBasisConflict(m: MediaItem): { stored: number; derived: number } | null {
  const stored = m.impressions;
  const daily = m.dailyFootTraffic;
  if (stored == null || stored <= 0) return null;
  if (daily == null || daily <= 0) return null;
  const derived = daily * PLAN_DAYS_PER_MONTH;
  const diff = Math.abs(stored - derived) / derived;
  if (diff <= IMPRESSIONS_BASIS_CONFLICT_TOLERANCE) return null;
  return { stored, derived };
}

// ---------------------------------------------------------------------------
// 지역
// ---------------------------------------------------------------------------

/**
 * 매체 → 권역·세부구역 참조.
 *
 * `mapped` 는 **저장된 값에서 나왔는지** 를 뜻한다. 추론으로 채운 값은
 * `mapped: false` 로 표시해 폴백 라벨이 사실처럼 보이지 않게 한다.
 * (서울대입구역이 "구로/신도림"으로 출력되던 원인 — browse 택소노미에 관악 부재)
 */
function resolveRegionRef(
  m: MediaItem,
  warnings: PlanWarning[],
): PlanRegionRef {
  const macro = (m.region ?? "").trim() || "national";

  let zoneId: string | null = null;
  if (m.regionZone && isValidRegionZoneId(m.regionZone)) {
    zoneId = m.regionZone;
  } else {
    zoneId = mapDistrictToRegionZone(m.district, {
      location: m.location,
      city: m.city,
    });
    if (zoneId == null) {
      warnings.push(warn({
        code: "REGION_UNMAPPED",
        severity: "warn",
        messageKo: `${m.name} — 권역을 특정하지 못했습니다.`,
        messageEn: `${m.name} — could not resolve a region zone.`,
        mediaId: m.id,
        context: { district: m.district ?? null, city: m.city ?? null },
      }));
    }
  }

  const storedMain = m.regionMain?.trim() || null;
  const storedSub = m.regionSub?.trim() || null;
  const storedSubValid =
    storedMain != null &&
    storedSub != null &&
    getBrowseRegionSub(storedMain, storedSub) != null;

  let mainId = storedMain;
  let subId = storedSub;
  let mapped = storedSubValid;

  if (!storedSubValid) {
    const inferred = inferBrowseRegionFromMedia({
      region: m.region,
      regionZone: m.regionZone,
      city: m.city,
      district: m.district,
      location: m.location,
    });
    mainId = inferred.main;
    subId = inferred.sub;
    mapped = false;
    warnings.push(warn({
      code: "REGION_SUB_UNMAPPED",
      severity: "warn",
      messageKo: `${m.name} — 세부 구역이 저장돼 있지 않아 추정값을 사용했습니다. 보고서에 확정 지역으로 표기하지 마세요.`,
      messageEn: `${m.name} — no stored sub-region; an inferred value was used. Do not present it as confirmed.`,
      mediaId: m.id,
      context: {
        storedMain,
        storedSub,
        inferredMain: inferred.main,
        inferredSub: inferred.sub,
      },
    }));
  }

  const subLabel = (loc: "ko" | "en"): string | null =>
    mainId && subId ? browseRegionLabel(subId, loc, "sub", mainId) : null;

  const labelKo =
    subLabel("ko") ?? regionZoneLabel(zoneId, "ko") ?? "지역 미지정";
  const labelEn =
    subLabel("en") ?? regionZoneLabel(zoneId, "en") ?? "Region unspecified";

  return { macro, zoneId, subId, labelKo, labelEn, mapped };
}

// ---------------------------------------------------------------------------
// 매체
// ---------------------------------------------------------------------------

function buildMediaItems(
  input: CalcPlanInput,
  period: PlanPeriod,
  warnings: PlanWarning[],
): PlanMediaItem[] {
  const rows = input.media.map((entry) => {
    const m = entry.media;
    const monthlyImpressions = Math.max(
      0,
      round(resolveImpressionsForUnits(m, entry.units)),
    );
    const dailyImpressions = monthlyImpressions / PLAN_DAYS_PER_MONTH;
    const campaignImpressions = round(dailyImpressions * period.days);
    const itemNet = Math.max(0, round(entry.itemNet));

    const visNorm = normalizeVisibilityScore(m.visibilityScore);
    const rawType = (m.type ?? "").trim();
    const type: PlanMediaType | null = isValidCatalogMediaType(rawType)
      ? (rawType.toLowerCase() as PlanMediaType)
      : null;
    if (type == null) {
      warnings.push(warn({
        code: "MEDIA_TYPE_UNKNOWN",
        severity: "info",
        messageKo: `${m.name} — 매체 유형 "${rawType || "(비어 있음)"}" 이 카탈로그 3종(디지털·고정형·이동형)에 없습니다.`,
        messageEn: `${m.name} — media type "${rawType || "(empty)"}" is not one of digital/static/mobile.`,
        mediaId: m.id,
        context: { rawType: rawType || null },
      }));
    }

    if (monthlyImpressions <= 0) {
      warnings.push(warn({
        code: "MEDIA_IMPRESSIONS_MISSING",
        severity: "warn",
        messageKo: `${m.name} — 유동인구·노출 데이터가 없어 노출 0 으로 집계됩니다.`,
        messageEn: `${m.name} — no traffic data; counted as zero impressions.`,
        mediaId: m.id,
      }));
    }

    if (itemNet <= 0) {
      warnings.push(warn({
        code: "MEDIA_PRICE_MISSING",
        severity: "warn",
        messageKo: `${m.name} — 단가가 0 이라 예산 비중·CPM 이 왜곡될 수 있습니다.`,
        messageEn: `${m.name} — zero net price; budget share and CPM may be distorted.`,
        mediaId: m.id,
      }));
    }

    const conflict = detectBasisConflict(m);
    if (conflict) {
      warnings.push(warn({
        code: "IMPRESSIONS_BASIS_CONFLICT",
        severity: "info",
        messageKo: `${m.name} — 저장된 노출(${conflict.stored.toLocaleString("ko-KR")})과 일 유동인구 환산값(${conflict.derived.toLocaleString("ko-KR")})이 다릅니다. 현재는 유동인구 기준을 사용합니다.`,
        messageEn: `${m.name} — stored impressions (${conflict.stored.toLocaleString("en-US")}) differ from the daily-footfall estimate (${conflict.derived.toLocaleString("en-US")}). The footfall basis is in use.`,
        mediaId: m.id,
        context: { stored: conflict.stored, derived: conflict.derived },
      }));
    }

    return {
      id: m.id,
      name: m.name,
      type,
      rawType,
      categoryKey: plannerReportCategoryKey(m),
      browseCategoryKey: plannerBrowseCategoryKey(m),
      region: resolveRegionRef(m, warnings),
      units: entry.units ?? 1,
      monthlyImpressions,
      impressionsBasis: resolveBasis(m),
      dailyImpressions,
      rawDailyFootTraffic: m.dailyFootTraffic ?? null,
      campaignImpressions,
      itemNet,
      impressionShare: 0,
      budgetShare: 0,
      cpmWon: cpmOf(itemNet, campaignImpressions),
      monthlyCpmWon: cpmOf(itemNet, monthlyImpressions),
      visibilityNorm: visNorm,
      ots: round(campaignImpressions * visNorm),
    } satisfies PlanMediaItem;
  });

  const totalImpressions = rows.reduce((s, r) => s + r.campaignImpressions, 0);
  const totalNet = rows.reduce((s, r) => s + r.itemNet, 0);
  for (const r of rows) {
    r.impressionShare = sharePct(r.campaignImpressions, totalImpressions);
    r.budgetShare = sharePct(r.itemNet, totalNet);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// 집계
// ---------------------------------------------------------------------------

function groupToShares(
  items: readonly PlanMediaItem[],
  keyOf: (item: PlanMediaItem) => string | null,
  labelsOf: (key: string) => { labelKo: string; labelEn: string },
): Share[] {
  const groups = new Map<
    string,
    { impressions: number; budget: number; count: number }
  >();

  for (const item of items) {
    const key = keyOf(item);
    if (key == null) continue;
    const g = groups.get(key) ?? { impressions: 0, budget: 0, count: 0 };
    g.impressions += item.campaignImpressions;
    g.budget += item.itemNet;
    g.count += 1;
    groups.set(key, g);
  }

  const totalImpressions = [...groups.values()].reduce(
    (s, g) => s + g.impressions,
    0,
  );
  const totalBudget = [...groups.values()].reduce((s, g) => s + g.budget, 0);

  return [...groups.entries()]
    .map(([key, g]) => {
      const labels = labelsOf(key);
      return {
        key,
        labelKo: labels.labelKo,
        labelEn: labels.labelEn,
        budgetAmount: g.budget,
        budgetShare: sharePct(g.budget, totalBudget),
        impressions: g.impressions,
        impressionShare: sharePct(g.impressions, totalImpressions),
        cpmWon: cpmOf(g.budget, g.impressions),
        mediaCount: g.count,
      } satisfies Share;
    })
    .sort((a, b) => b.impressions - a.impressions);
}

function buildBreakdown(items: readonly PlanMediaItem[]): PlanBreakdown {
  const subLabels = new Map<string, { labelKo: string; labelEn: string }>();
  const zoneLabels = new Map<string, { labelKo: string; labelEn: string }>();
  for (const item of items) {
    if (item.region.subId && !subLabels.has(item.region.subId)) {
      subLabels.set(item.region.subId, {
        labelKo: item.region.labelKo,
        labelEn: item.region.labelEn,
      });
    }
    if (item.region.zoneId && !zoneLabels.has(item.region.zoneId)) {
      zoneLabels.set(item.region.zoneId, {
        labelKo: regionZoneLabel(item.region.zoneId, "ko") ?? item.region.zoneId,
        labelEn: regionZoneLabel(item.region.zoneId, "en") ?? item.region.zoneId,
      });
    }
  }

  return {
    byCategory: groupToShares(
      items,
      (i) => i.categoryKey,
      plannerReportCategoryLabels,
    ),
    byBrowseCategory: groupToShares(
      items,
      (i) => i.browseCategoryKey,
      plannerBrowseCategoryLabels,
    ),
    byRegion: groupToShares(
      items,
      (i) => i.region.zoneId,
      (key) => zoneLabels.get(key) ?? { labelKo: key, labelEn: key },
    ),
    byRegionSub: groupToShares(
      items,
      (i) => i.region.subId,
      (key) => subLabels.get(key) ?? { labelKo: key, labelEn: key },
    ),
  };
}

// ---------------------------------------------------------------------------
// 도달
// ---------------------------------------------------------------------------

/**
 * 포화 모델 — **포트폴리오 전체 단위에서만** 산출한다.
 *
 *   audiencePool = max(daily in region) × days × regionUniqueFactor
 *   reach        = pool × (1 − exp(−impressions / pool))
 *
 * 지역·구 단위로 쪼개면 매체 1개 그룹에서 `f × (1 − e^(−1/f))` = 0.4013 (f=0.45)
 * 이라는 상수만 반복되므로 `Share` 에는 도달을 넣지 않는다.
 */
function computeReach(
  items: readonly PlanMediaItem[],
  period: PlanPeriod,
  totalImpressions: number,
  regionUniqueFactor: number,
  warnings: PlanWarning[],
): PlanReach {
  if (items.length === 0 || totalImpressions <= 0) {
    warnings.push(warn({
      code: "REACH_NOT_MODELED",
      severity: "info",
      messageKo: "노출 데이터가 없어 추정 도달을 산출하지 못했습니다.",
      messageEn: "No impression data; reach could not be modeled.",
    }));
    return {
      status: "estimating",
      value: null,
      frequency: null,
      model: null,
      regionUniqueFactor: null,
    };
  }

  const byMacro = new Map<string, { impressions: number; maxDaily: number }>();
  for (const item of items) {
    const g = byMacro.get(item.region.macro) ?? { impressions: 0, maxDaily: 0 };
    g.impressions += item.campaignImpressions;
    if (item.dailyImpressions > g.maxDaily) g.maxDaily = item.dailyImpressions;
    byMacro.set(item.region.macro, g);
  }

  let reach = 0;
  for (const g of byMacro.values()) {
    if (g.impressions <= 0 || g.maxDaily <= 0) continue;
    const pool = g.maxDaily * period.days * regionUniqueFactor;
    if (pool <= 0) continue;
    reach += pool * (1 - Math.exp(-g.impressions / pool));
  }
  reach = round(reach);

  if (reach <= 0) {
    warnings.push(warn({
      code: "REACH_NOT_MODELED",
      severity: "info",
      messageKo: "추정 도달이 0 으로 계산되어 표시하지 않습니다.",
      messageEn: "Modeled reach came out as zero; not displayed.",
    }));
    return {
      status: "estimating",
      value: null,
      frequency: null,
      model: null,
      regionUniqueFactor: null,
    };
  }

  return {
    status: "modeled",
    value: reach,
    frequency: Math.max(1, Math.round((totalImpressions / reach) * 10) / 10),
    model: "saturation",
    regionUniqueFactor,
  };
}

// ---------------------------------------------------------------------------
// 예산
// ---------------------------------------------------------------------------

function computeBudgetUsage(
  budgetWon: number,
  usedWon: number,
  warnings: PlanWarning[],
): PlanBudgetUsage {
  const budget = Math.max(0, round(budgetWon));
  if (budget <= 0) {
    return {
      budgetWon: 0,
      usedWon,
      usagePct: 0,
      remainingWon: -usedWon,
      status: "fit",
    };
  }

  const usagePct = Math.round((usedWon / budget) * 1000) / 10;
  const status: PlanBudgetUsage["status"] =
    usagePct > BUDGET_OVER_PCT
      ? "over"
      : usagePct < BUDGET_UNDER_PCT
        ? "under"
        : "fit";

  if (status === "over") {
    warnings.push(warn({
      code: "BUDGET_OVER",
      severity: "warn",
      messageKo: `매체 순액이 예산의 ${usagePct}% 입니다.`,
      messageEn: `Media net is ${usagePct}% of the budget.`,
      context: { budgetWon: budget, usedWon, usagePct },
    }));
  } else if (status === "under") {
    warnings.push(warn({
      code: "BUDGET_UNDER_UTILIZED",
      severity: "info",
      messageKo: `예산 소진율이 ${usagePct}% 입니다. 매체를 더 담을 수 있습니다.`,
      messageEn: `Budget utilization is ${usagePct}%; there is room for more media.`,
      context: { budgetWon: budget, usedWon, usagePct },
    }));
  }

  return {
    budgetWon: budget,
    usedWon,
    usagePct,
    remainingWon: budget - usedWon,
    status,
  };
}

// ---------------------------------------------------------------------------
// 진입점
// ---------------------------------------------------------------------------

export function calculatePlan(input: CalcPlanInput): PlanResult {
  const warnings: PlanWarning[] = [];
  const isKo = (input.locale ?? "ko") === "ko";
  const regionUniqueFactor = Math.max(
    0.05,
    Math.min(1, input.regionUniqueFactor ?? DEFAULT_REGION_UNIQUE_FACTOR),
  );

  const period = normalizePeriod(input.period, warnings);
  const mediaItems = buildMediaItems(input, period, warnings);

  const daily = mediaItems.reduce((s, m) => s + m.dailyImpressions, 0);
  const monthlyEquivalent = mediaItems.reduce(
    (s, m) => s + m.monthlyImpressions,
    0,
  );
  const campaignTotal = mediaItems.reduce(
    (s, m) => s + m.campaignImpressions,
    0,
  );
  const mediaNet = mediaItems.reduce((s, m) => s + m.itemNet, 0);
  const ots = mediaItems.reduce((s, m) => s + m.ots, 0);

  const budgetUsage = computeBudgetUsage(input.budgetWon, mediaNet, warnings);
  const reach = computeReach(
    mediaItems,
    period,
    campaignTotal,
    regionUniqueFactor,
    warnings,
  );

  return {
    meta: {
      planId: input.planId ?? null,
      goal: input.goal ?? null,
      industryKey: input.industryKey ?? null,
      locale: isKo ? "ko" : "en",
      mediaCount: mediaItems.length,
      calculatedAt: (input.now ?? new Date()).toISOString(),
      engineVersion: PLAN_ENGINE_VERSION,
    },
    period,
    money: {
      currency: "KRW",
      mediaNet,
      budgetInput: Math.max(0, round(input.budgetWon)),
    },
    budgetUsage,
    impressions: {
      daily: round(daily),
      monthlyEquivalent: round(monthlyEquivalent),
      campaignTotal,
      ots,
    },
    cpm: {
      campaignWon: cpmOf(mediaNet, campaignTotal),
      monthlyWon: cpmOf(mediaNet, round(monthlyEquivalent)),
      budgetWon: cpmOf(budgetUsage.budgetWon, campaignTotal),
    },
    reach,
    breakdown: buildBreakdown(mediaItems),
    mediaItems,
    warnings,
  };
}
