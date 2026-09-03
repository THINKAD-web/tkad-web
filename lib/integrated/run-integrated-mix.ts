import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import { resolveCrossChannelAllocation } from "@/lib/integrated/allocation-policy";
import {
  buildDigitalMixPayload,
  buildOohRecommendationContext,
} from "@/lib/integrated/field-adapters";
import { resolveDigitalMix } from "@/lib/digital/resolve-digital-mix";
import { mergeIntegratedKpis } from "@/lib/integrated/merge-kpis";
import { buildOohLeg, isOohCatalogInsufficient } from "@/lib/integrated/ooh-leg";
import type {
  IntegratedMixRequest,
  IntegratedMixResponse,
  DigitalMixResult,
} from "@/lib/integrated/schemas";
import { normalizePlannerAgeKeys } from "@/lib/planner/types";

const MIN_DIGITAL_CHANNELS = 3;

export type RunIntegratedMixResult =
  | { ok: true; response: IntegratedMixResponse }
  | {
      ok: false;
      status: 422 | 503;
      error: "INSUFFICIENT_CATALOG" | "UPSTREAM_UNAVAILABLE";
      message: string;
    };

function filterDigitalMixBySlugs(
  mix: DigitalMixResult,
  slugs: string[] | undefined,
): DigitalMixResult | null {
  if (!slugs?.length) return mix;
  const allow = new Set(slugs);
  const channels = mix.channels.filter((c) => allow.has(c.media.slug));
  if (channels.length < MIN_DIGITAL_CHANNELS) return null;
  return { ...mix, channels };
}

export async function runIntegratedMix(
  request: IntegratedMixRequest,
): Promise<RunIntegratedMixResult> {
  const locale = request.locale ?? "ko";
  const ageKeys = normalizePlannerAgeKeys(request.ageKeys ?? []);

  const allocation = resolveCrossChannelAllocation({
    budgetTotalWon: request.budgetTotalWon,
    goal: request.goal,
    digitalBudgetPct: request.digitalBudgetPct,
  });

  const catalog = await fetchPublicMediaCatalogList();
  const recommendCtx = buildOohRecommendationContext({
    goal: request.goal,
    regions: request.regions,
    ageKeys,
    industry: request.industry,
    oohBudgetMan: allocation.oohBudgetWon / 10_000,
    periodMonths: request.periodMonths,
  });

  const oohLeg = buildOohLeg({
    catalog,
    recommendCtx,
    oohBudgetWon: allocation.oohBudgetWon,
    selectedOohMediaIds: request.selectedOohMediaIds,
    locale,
  });

  if (isOohCatalogInsufficient(oohLeg)) {
    return {
      ok: false,
      status: 422,
      error: "INSUFFICIENT_CATALOG",
      message: "OOH catalog could not produce enough recommendations for this brief",
    };
  }

  const digitalPayload = buildDigitalMixPayload({
    goal: request.goal,
    industry: request.industry,
    regions: request.regions,
    ageKeys,
    gender: request.target?.gender,
    digitalBudgetWon: allocation.digitalBudgetWon,
    periodMonths: request.periodMonths,
  });

  const digitalResolved = await resolveDigitalMix(digitalPayload);
  if (!digitalResolved.data) {
    return {
      ok: false,
      status: 503,
      error: "UPSTREAM_UNAVAILABLE",
      message: "Digital mix service is temporarily unavailable",
    };
  }

  const digitalMix = filterDigitalMixBySlugs(
    digitalResolved.data,
    request.selectedDigitalSlugs,
  );
  if (!digitalMix || digitalMix.channels.length < MIN_DIGITAL_CHANNELS) {
    return {
      ok: false,
      status: 422,
      error: "INSUFFICIENT_CATALOG",
      message: "Digital catalog could not produce enough channels for this brief",
    };
  }

  const merged = mergeIntegratedKpis({
    oohImpressions: oohLeg!.metrics.impressions,
    digitalMix,
  });

  const prefix = locale === "ko" ? "/ko" : "/en";
  const response: IntegratedMixResponse = {
    meta: {
      channelType: "integrated",
      generatedAt: new Date().toISOString(),
      version: "v1",
      oohCatalogSize: catalog.length,
      digitalCatalogSize: digitalResolved.catalogSize,
      allocationPolicy: allocation.policy,
    },
    allocation: {
      oohBudgetWon: allocation.oohBudgetWon,
      digitalBudgetWon: allocation.digitalBudgetWon,
      oohBudgetPct: allocation.oohBudgetPct,
      digitalBudgetPct: allocation.digitalBudgetPct,
    },
    ooh: {
      recommended: oohLeg!.recommended,
      metrics: oohLeg!.metrics,
    },
    digital: { mix: digitalMix },
    integrated: merged,
    handoff: {
      contactUrl: `${prefix}/contact?source=integrated-mix`,
      plannerUrl: `${prefix}/planner/integrated`,
    },
  };

  return { ok: true, response };
}
