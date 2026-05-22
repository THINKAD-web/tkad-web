import type { MediaItem } from "@/lib/media-data";
import {
  computeAdvancedPlannerMetrics,
  computePlannerMetrics,
  type PlannerCampaignGoal,
} from "@/lib/planner-logic";
import {
  getDigitalChannel,
  OOH_DIGITAL_SYNERGY_LIFT,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";

export type DigitalChannelMetrics = {
  id: DigitalChannelId;
  nameKo: string;
  nameEn: string;
  budgetMan: number;
  budgetWon: number;
  estimatedClicks: number;
  estimatedImpressions: number;
  avgCpcWon: number;
};

export type IntegratedCampaignMetrics = {
  oohImpressions: number;
  oohReach: number;
  oohCpmKrw: number | null;
  digitalChannels: DigitalChannelMetrics[];
  digitalTotalClicks: number;
  digitalTotalImpressions: number;
  brandSearchBaseline: number;
  brandSearchDuring: number;
  brandSearchChangePct: number;
  integratedRoasConservative: number;
  integratedRoasExpected: number;
  integratedRoasOptimistic: number;
  synergyLiftMultiplier: number;
  oohBudgetMan: number;
  digitalBudgetMan: number;
};

function estimateBrandSearchVolume(
  budgetMan: number,
  regions: string[],
  goal: PlannerCampaignGoal | null,
): number {
  const regionFactor = Math.max(1, regions.length * 0.35);
  const goalFactor =
    goal === "brand" ? 1.2 : goal === "local" ? 1.15 : goal === "launch" ? 1.1 : 1;
  return Math.round(budgetMan * 12 * regionFactor * goalFactor);
}

export function computeIntegratedCampaignMetrics(opts: {
  portfolio: MediaItem[];
  budgetMan: number;
  months: number;
  digitalBudgetPct: number;
  digitalChannelIds: DigitalChannelId[];
  regions: string[];
  goal: PlannerCampaignGoal | null;
}): IntegratedCampaignMetrics | null {
  const {
    portfolio,
    budgetMan,
    months,
    digitalBudgetPct,
    digitalChannelIds,
    regions,
    goal,
  } = opts;
  if (portfolio.length === 0 || budgetMan <= 0) return null;

  const oohBudgetMan = Math.round(budgetMan * ((100 - digitalBudgetPct) / 100));
  const digitalBudgetMan = budgetMan - oohBudgetMan;

  const oohMetrics = computePlannerMetrics(portfolio, oohBudgetMan, months, {
    campaignGoal: goal,
  });
  const advanced = computeAdvancedPlannerMetrics({
    portfolio,
    budgetMan: oohBudgetMan,
    months,
  });

  const channelCount = Math.max(1, digitalChannelIds.length);
  const perChannelMan = digitalBudgetMan / channelCount;

  const digitalChannels: DigitalChannelMetrics[] = digitalChannelIds.map(
    (id) => {
      const ch = getDigitalChannel(id)!;
      const budgetWon = perChannelMan * 10_000;
      const estimatedClicks = Math.round(budgetWon / ch.avgCpcWon);
      const estimatedImpressions = Math.round(
        estimatedClicks / Math.max(ch.ctr, 0.001),
      );
      return {
        id,
        nameKo: ch.nameKo,
        nameEn: ch.nameEn,
        budgetMan: Math.round(perChannelMan),
        budgetWon,
        estimatedClicks,
        estimatedImpressions,
        avgCpcWon: ch.avgCpcWon,
      };
    },
  );

  const digitalTotalClicks = digitalChannels.reduce(
    (s, c) => s + c.estimatedClicks,
    0,
  );
  const digitalTotalImpressions = digitalChannels.reduce(
    (s, c) => s + c.estimatedImpressions,
    0,
  );

  const brandSearchBaseline = estimateBrandSearchVolume(
    budgetMan * 0.3,
    regions,
    goal,
  );
  const brandSearchDuring = Math.round(
    brandSearchBaseline * OOH_DIGITAL_SYNERGY_LIFT,
  );
  const brandSearchChangePct = Math.round(
    ((brandSearchDuring - brandSearchBaseline) / brandSearchBaseline) * 100,
  );

  const baseRoas = oohMetrics?.roiExpected ?? 1.5;
  const digitalBoost = digitalBudgetPct > 0 ? 1 + digitalBudgetPct / 200 : 1;
  const synergyBoost = digitalChannelIds.length > 0 ? OOH_DIGITAL_SYNERGY_LIFT / 2 : 1;

  return {
    oohImpressions: oohMetrics?.estimatedTotalImpressions ?? 0,
    oohReach: advanced?.uniqueReach ?? oohMetrics?.estimatedTotalImpressions ?? 0,
    oohCpmKrw: advanced?.cpmKrw ?? null,
    digitalChannels,
    digitalTotalClicks,
    digitalTotalImpressions,
    brandSearchBaseline,
    brandSearchDuring,
    brandSearchChangePct,
    integratedRoasConservative:
      Math.round(baseRoas * digitalBoost * 0.85 * 10) / 10,
    integratedRoasExpected:
      Math.round(baseRoas * digitalBoost * synergyBoost * 10) / 10,
    integratedRoasOptimistic:
      Math.round(baseRoas * digitalBoost * synergyBoost * 1.25 * 10) / 10,
    synergyLiftMultiplier: OOH_DIGITAL_SYNERGY_LIFT,
    oohBudgetMan,
    digitalBudgetMan,
  };
}
