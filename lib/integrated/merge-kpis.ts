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

/** dmpilot MixResult KPIs are monthly; OOH planner metrics are campaign totals. */
function campaignMonthsFromDigitalMix(digitalMix: DigitalMixResult): number {
  return Math.max(1, Math.round(digitalMix.input.periodWeeks / 4));
}

export function mergeIntegratedKpis(opts: {
  oohImpressions: number;
  digitalMix: DigitalMixResult;
}): MergedIntegratedKpis {
  const { oohImpressions, digitalMix } = opts;
  const campaignMonths = campaignMonthsFromDigitalMix(digitalMix);

  const dMinMonthly = digitalMix.kpis.impressionsMin;
  const dMaxMonthly = digitalMix.kpis.impressionsMax ?? dMinMonthly;
  const dMin =
    dMinMonthly != null ? dMinMonthly * campaignMonths : null;
  const dMax =
    dMaxMonthly != null ? dMaxMonthly * campaignMonths : null;

  const clicksMinMonthly = digitalMix.kpis.clicksMin;
  const clicksMaxMonthly = digitalMix.kpis.clicksMax;
  const totalClicksMin =
    clicksMinMonthly != null ? clicksMinMonthly * campaignMonths : null;
  const totalClicksMax =
    clicksMaxMonthly != null ? clicksMaxMonthly * campaignMonths : null;

  const oohMin = oohImpressions > 0 ? Math.round(oohImpressions * 0.85) : null;
  const oohMax = oohImpressions > 0 ? Math.round(oohImpressions * 1.15) : null;

  let totalImpressionsMin: number | null = null;
  let totalImpressionsMax: number | null = null;

  if (oohMin != null && dMin != null) {
    const baseMin = oohMin + dMin;
    const baseMax = (oohMax ?? oohMin) + (dMax ?? dMin);
    // Conservative band uses half synergy (aligned with integrated-metrics ROAS expected).
    totalImpressionsMin = Math.round(baseMin * (OOH_DIGITAL_SYNERGY_LIFT / 2));
    totalImpressionsMax = Math.round(baseMax * OOH_DIGITAL_SYNERGY_LIFT);
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
      totalClicksMin,
      totalClicksMax,
    },
    disclaimers: {
      ko: "통합 KPI는 OOH·디지털 추정치(집행 기간 기준) 합산에 시너지 계수를 적용한 참고값이며, 실제 집행 결과와 다를 수 있습니다.",
      en: "Combined KPIs sum OOH and digital estimates over the campaign period with a synergy factor; actual results may differ.",
    },
  };
}
