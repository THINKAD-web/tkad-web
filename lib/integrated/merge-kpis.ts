import { OOH_DIGITAL_SYNERGY_LIFT } from "@/lib/planner/digital-channels";
import type { DigitalMixResult } from "@/lib/integrated/schemas";

export type MergedIntegratedKpis = {
  synergyLiftMultiplier: number;
  combinedKpis: {
    totalImpressionsMin: number | null;
    totalImpressionsMax: number | null;
    totalClicksMin: number | null;
    totalClicksMax: number | null;
  };
  disclaimers: {
    ko: string;
    en: string;
  };
};

export function mergeIntegratedKpis(opts: {
  oohImpressions: number;
  digitalMix: DigitalMixResult;
}): MergedIntegratedKpis {
  const { oohImpressions, digitalMix } = opts;
  const dMin = digitalMix.kpis.impressionsMin;
  const dMax = digitalMix.kpis.impressionsMax ?? dMin;

  const oohMin = oohImpressions > 0 ? Math.round(oohImpressions * 0.85) : null;
  const oohMax = oohImpressions > 0 ? Math.round(oohImpressions * 1.15) : null;

  let totalImpressionsMin: number | null = null;
  let totalImpressionsMax: number | null = null;

  if (oohMin != null && dMin != null) {
    const base = oohMin + dMin;
    totalImpressionsMin = Math.round(base * (OOH_DIGITAL_SYNERGY_LIFT / 2));
    totalImpressionsMax = Math.round(
      ((oohMax ?? oohMin) + (dMax ?? dMin)) * OOH_DIGITAL_SYNERGY_LIFT,
    );
  } else if (oohMin != null) {
    totalImpressionsMin = oohMin;
    totalImpressionsMax = oohMax;
  } else if (dMin != null) {
    totalImpressionsMin = dMin;
    totalImpressionsMax = dMax;
  }

  return {
    synergyLiftMultiplier: OOH_DIGITAL_SYNERGY_LIFT,
    combinedKpis: {
      totalImpressionsMin,
      totalImpressionsMax,
      totalClicksMin: digitalMix.kpis.clicksMin,
      totalClicksMax: digitalMix.kpis.clicksMax,
    },
    disclaimers: {
      ko: "통합 KPI는 OOH·디지털 추정치 합산에 시너지 계수를 적용한 참고값이며, 실제 집행 결과와 다를 수 있습니다.",
      en: "Combined KPIs apply a synergy factor to OOH and digital estimates; actual campaign results may differ.",
    },
  };
}
