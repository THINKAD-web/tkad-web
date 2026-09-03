import {
  estimatePerformance,
  onlinePricingLabel,
} from "@/lib/pricing/online-performance-estimate";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type {
  CampaignGoal,
  MixAggregateKpi,
  MixChannelAllocation,
  MixInput,
  MixResult,
} from "@/lib/digital/mix-types";
import {
  MIX_ENGINE_MAX_CHANNELS,
  MIX_ENGINE_MIN_CHANNELS,
} from "@/lib/digital/mix-types";

/** Adjacent goals when primary goal yields too few candidates. */
export const GOAL_ADJACENCY: Record<CampaignGoal, CampaignGoal[]> = {
  AWARENESS: ["AWARENESS", "TRAFFIC"],
  TRAFFIC: ["TRAFFIC", "CONVERSION", "AWARENESS", "VISIT"],
  CONVERSION: ["CONVERSION", "TRAFFIC", "LEAD"],
  LEAD: ["LEAD", "CONVERSION", "TRAFFIC"],
  APP_INSTALL: ["APP_INSTALL", "TRAFFIC", "CONVERSION"],
  VISIT: ["VISIT", "TRAFFIC", "CONVERSION"],
};

const MIN_CANDIDATES_FOR_PRIMARY = 3;

function isAwarenessMedia(m: PublicMediaView): boolean {
  return m.mediaType === "SNS" || m.mediaType === "VIDEO" || m.mediaType === "DA";
}

function isConversionMedia(m: PublicMediaView): boolean {
  return m.mediaType === "SA" || m.billingType.includes("CPA");
}

function ageMatches(mediaAge: string[], targetAge: string): boolean {
  const t = targetAge.trim();
  if (!t) return true;
  if (mediaAge.length === 0) return true;
  return mediaAge.some((a) => a === t || t.includes(a) || a.includes(t.slice(0, 2)));
}

function scoreMedia(
  m: PublicMediaView,
  input: MixInput,
  effectiveGoals: CampaignGoal[],
): number {
  let score = 0;
  if (m.fitIndustries.includes(input.industry)) score += 3;
  for (const g of effectiveGoals) {
    if (m.fitGoals.includes(g)) score += 4;
  }
  if (ageMatches(m.ageTargets, input.target.age)) score += 2;
  if (
    !input.target.gender ||
    m.genderTarget === "ALL" ||
    m.genderTarget === input.target.gender
  ) {
    score += 1;
  }
  if (
    m.geoTargeting.includes("KR") ||
    (input.target.geo && m.geoTargeting.some((g) => g === input.target.geo))
  ) {
    score += 1;
  }
  score += (1000 - m.sortOrder) / 10_000;
  return score;
}

function resolveEffectiveGoals(
  catalog: PublicMediaView[],
  goal: CampaignGoal,
): {
  effectiveGoals: CampaignGoal[];
  usedFallback: boolean;
  fallbackGoals: CampaignGoal[];
} {
  const chain = GOAL_ADJACENCY[goal] ?? [goal];
  for (let i = 0; i < chain.length; i++) {
    const effectiveGoals = chain.slice(0, i + 1);
    const count = catalog.filter((m) =>
      effectiveGoals.some((g) => m.fitGoals.includes(g)),
    ).length;
    if (count >= MIN_CANDIDATES_FOR_PRIMARY || i === chain.length - 1) {
      return {
        effectiveGoals,
        usedFallback: i > 0,
        fallbackGoals: i > 0 ? effectiveGoals.slice(1) : [],
      };
    }
  }
  return { effectiveGoals: chain, usedFallback: false, fallbackGoals: [] };
}

function funnelStage(m: PublicMediaView): MixChannelAllocation["funnelStage"] {
  if (isConversionMedia(m)) return "conversion";
  if (isAwarenessMedia(m)) return "awareness";
  return "consideration";
}

function defaultReason(m: PublicMediaView, input: MixInput): string {
  const parts: string[] = [];
  if (m.fitIndustries.includes(input.industry)) {
    parts.push("업종 적합도 높음");
  }
  if (m.strengths[0]) parts.push(m.strengths[0]);
  if (m.kpiHintsKo[0]) parts.push(m.kpiHintsKo[0]);
  return parts.slice(0, 2).join(" · ") || `${m.nameKo} 특성상 목표에 부합`;
}

function allocateBudgets(
  scored: { media: PublicMediaView; score: number }[],
  totalBudget: number,
): Map<string, number> {
  const totalScore = scored.reduce((s, x) => s + x.score, 0);
  const raw = scored.map((x) => ({
    slug: x.media.slug,
    amount:
      totalScore > 0
        ? (x.score / totalScore) * totalBudget
        : totalBudget / scored.length,
  }));
  const floored = raw.map((x) => ({
    slug: x.slug,
    amount: Math.floor(x.amount),
  }));
  let remainder = totalBudget - floored.reduce((s, x) => s + x.amount, 0);
  const sorted = [...floored].sort((a, b) => b.amount - a.amount);
  let i = 0;
  while (remainder > 0 && sorted.length > 0) {
    sorted[i % sorted.length]!.amount += 1;
    remainder -= 1;
    i += 1;
  }
  return new Map(sorted.map((x) => [x.slug, x.amount]));
}

function pricingLabelForMedia(m: PublicMediaView): string {
  return onlinePricingLabel({
    cpcMin: m.cpcMin,
    cpcMax: m.cpcMax,
    cpmMin: m.cpmMin,
    cpmMax: m.cpmMax,
    minBudget: m.minBudget ?? m.monthlyBudgetMin,
  });
}

function channelPerformance(
  m: PublicMediaView,
  budgetWon: number,
): MixChannelAllocation["performance"] {
  const est = estimatePerformance(
    {
      cpcMin: m.cpcMin,
      cpcMax: m.cpcMax,
      cpmMin: m.cpmMin,
      cpmMax: m.cpmMax,
      minBudget: m.minBudget ?? m.monthlyBudgetMin,
    },
    budgetWon,
  );
  return {
    impressionsMin: est?.reachMin ?? null,
    impressionsMax: est?.reachMax ?? null,
    clicksMin: est?.clicksMin ?? null,
    clicksMax: est?.clicksMax ?? null,
    pricingLabel: pricingLabelForMedia(m),
  };
}

function aggregateKpis(
  channels: MixChannelAllocation[],
  goal: CampaignGoal,
): MixAggregateKpi {
  let impressionsMin = 0;
  let impressionsMax = 0;
  let hasImpressions = false;
  let clicksMin = 0;
  let clicksMax = 0;
  let hasClicks = false;

  for (const ch of channels) {
    const p = ch.performance;
    if (p.impressionsMin != null && p.impressionsMax != null) {
      impressionsMin += p.impressionsMin;
      impressionsMax += p.impressionsMax;
      hasImpressions = true;
    }
    if (p.clicksMin != null && p.clicksMax != null) {
      clicksMin += p.clicksMin;
      clicksMax += p.clicksMax;
      hasClicks = true;
    }
  }

  const visitsMin =
    goal === "TRAFFIC" || goal === "VISIT" ? (hasClicks ? clicksMin : null) : null;
  const visitsMax =
    goal === "TRAFFIC" || goal === "VISIT" ? (hasClicks ? clicksMax : null) : null;

  return {
    impressionsMin: hasImpressions ? impressionsMin : null,
    impressionsMax: hasImpressions ? impressionsMax : null,
    clicksMin: hasClicks ? clicksMin : null,
    clicksMax: hasClicks ? clicksMax : null,
    visitsMin,
    visitsMax,
    reachLabel: "문의",
  };
}

/**
 * Deterministic media mix from published catalog SSOT only.
 * Ported from dmpilot `lib/digital/mix-engine.ts` (PR5-c).
 */
export function buildMediaMix(
  catalog: PublicMediaView[],
  input: MixInput,
  opts?: { reasons?: Record<string, string>; generatedAt?: string },
): MixResult {
  const { effectiveGoals, usedFallback, fallbackGoals } = resolveEffectiveGoals(
    catalog,
    input.goal,
  );

  const eligible = catalog
    .filter((m) => {
      const minB = m.minBudget ?? m.monthlyBudgetMin;
      if (minB > input.budgetMonthly) return false;
      return effectiveGoals.some((g) => m.fitGoals.includes(g));
    })
    .map((m) => ({ media: m, score: scoreMedia(m, input, effectiveGoals) }))
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.media.sortOrder - b.media.sortOrder ||
        a.media.slug.localeCompare(b.media.slug, "ko"),
    );

  let picked = eligible.slice(0, MIX_ENGINE_MAX_CHANNELS);

  const ensureType = (pred: (m: PublicMediaView) => boolean) => {
    if (picked.some((x) => pred(x.media))) return;
    const replacement = eligible.find(
      (x) => pred(x.media) && !picked.some((p) => p.media.slug === x.media.slug),
    );
    if (replacement) {
      if (picked.length >= MIX_ENGINE_MAX_CHANNELS) {
        picked = picked.slice(0, MIX_ENGINE_MAX_CHANNELS - 1);
      }
      picked = [...picked, replacement].sort(
        (a, b) =>
          b.score - a.score ||
          a.media.sortOrder - b.media.sortOrder ||
          a.media.slug.localeCompare(b.media.slug, "ko"),
      );
    }
  };

  ensureType(isAwarenessMedia);
  ensureType(isConversionMedia);

  if (picked.length > MIX_ENGINE_MAX_CHANNELS) {
    picked = picked.slice(0, MIX_ENGINE_MAX_CHANNELS);
  }
  while (
    picked.length < MIX_ENGINE_MIN_CHANNELS &&
    picked.length < eligible.length
  ) {
    const next = eligible.find(
      (x) => !picked.some((p) => p.media.slug === x.media.slug),
    );
    if (!next) break;
    picked = [...picked, next];
  }

  const budgets = allocateBudgets(picked, input.budgetMonthly);
  const total = input.budgetMonthly;

  const channels: MixChannelAllocation[] = picked
    .map((x) => {
      const budgetWon = budgets.get(x.media.slug) ?? 0;
      return {
        media: x.media,
        budgetWon,
        budgetPct: total > 0 ? Math.round((budgetWon / total) * 1000) / 10 : 0,
        funnelStage: funnelStage(x.media),
        reason: opts?.reasons?.[x.media.slug] ?? defaultReason(x.media, input),
        performance: channelPerformance(x.media, budgetWon),
      };
    })
    .sort((a, b) => b.budgetWon - a.budgetWon);

  const kpis = aggregateKpis(channels, input.goal);

  return {
    input,
    generatedAt: opts?.generatedAt ?? new Date().toISOString(),
    usedFallback,
    fallbackGoals,
    requestedGoal: input.goal,
    effectiveGoals,
    channels,
    kpis,
    donutSegments: channels.map((ch, i) => ({
      slug: ch.media.slug,
      nameKo: ch.media.nameKo,
      budgetWon: ch.budgetWon,
      colorIndex: (i % 6) + 1,
    })),
  };
}

export function formatKpiRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "문의";
  if (min != null && max != null) {
    if (min === max) return min.toLocaleString("ko-KR");
    return `${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}`;
  }
  return (min ?? max)!.toLocaleString("ko-KR");
}

export function formatMixBudgetLabel(won: number): string {
  return `₩${won.toLocaleString("ko-KR")}`;
}
