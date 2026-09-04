import type { MixResult } from "@/lib/digital/mix-types";
import type { DigitalMixResult } from "@/lib/integrated/schemas";

/** BFF/API subset — strips full PublicMediaView from mix-engine output. */
export function mixResultToDigitalMixResult(result: MixResult): DigitalMixResult {
  return {
    input: {
      industry: result.input.industry,
      goal: result.input.goal,
      budgetMonthly: result.input.budgetMonthly,
      periodWeeks: result.input.periodWeeks,
    },
    generatedAt: result.generatedAt,
    channels: result.channels.map((c) => ({
      media: {
        slug: c.media.slug,
        nameKo: c.media.nameKo,
        nameEn: c.media.nameEn,
      },
      budgetWon: c.budgetWon,
      budgetPct: c.budgetPct,
      reason: c.reason,
    })),
    kpis: {
      impressionsMin: result.kpis.impressionsMin,
      impressionsMax: result.kpis.impressionsMax,
      clicksMin: result.kpis.clicksMin,
      clicksMax: result.kpis.clicksMax,
    },
  };
}

export function mixChannelSlugs(result: MixResult | DigitalMixResult): string[] {
  return result.channels.map((c) => c.media.slug).sort();
}
