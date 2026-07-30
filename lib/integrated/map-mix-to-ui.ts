import type { MediaItem } from "@/lib/media-data";
import type { IntegratedMixResponse } from "@/lib/integrated/schemas";
import type { DigitalChannelId, DigitalChannel } from "@/lib/planner/digital-channels";
import {
  getDigitalChannelFromList,
  resolveDigitalChannels,
} from "@/lib/planner/digital-catalog-bridge";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type {
  DigitalRecommendResult,
  ScoredDigitalChannel,
} from "@/lib/planner/recommend-digital";

export function mixSlugToPlatformId(slug: string): DigitalChannelId | null {
  const s = slug.toLowerCase();
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("karrot") || s.includes("daangn") || s.includes("당근")) {
    return "daangn";
  }
  if (s.includes("buzzvil")) return "buzzvil";
  if (s.includes("naver")) return "naver";
  if (s.includes("kakao")) return "kakao";
  if (s.includes("google") || s.includes("youtube")) return "google";
  if (
    s.includes("meta") ||
    s.includes("instagram") ||
    s.includes("facebook")
  ) {
    return "meta";
  }
  return null;
}

export type IntegratedMixKpiView = {
  oohCampaignImpressions: number;
  digitalMonthlyImpressionsMin: number | null;
  digitalMonthlyImpressionsMax: number | null;
  combinedImpressionsMin: number | null;
  combinedImpressionsMax: number | null;
};

export function extractMixKpiView(mix: IntegratedMixResponse): IntegratedMixKpiView {
  const { ooh, digital, integrated } = mix;
  return {
    oohCampaignImpressions: ooh.metrics.impressions,
    digitalMonthlyImpressionsMin: digital.mix.kpis.impressionsMin,
    digitalMonthlyImpressionsMax: digital.mix.kpis.impressionsMax,
    combinedImpressionsMin: integrated.combinedKpis.totalImpressionsMin,
    combinedImpressionsMax: integrated.combinedKpis.totalImpressionsMax,
  };
}

function regionLabel(
  regions: string[],
  portfolio: MediaItem[],
  isKo: boolean,
): string {
  const fromMedia = portfolio.find((m) => m.region)?.region?.trim();
  if (fromMedia) return fromMedia;
  const primary = regions[0] ?? "seoul";
  const labels: Record<string, { ko: string; en: string }> = {
    seoul: { ko: "서울", en: "Seoul" },
    gyeonggi: { ko: "경기", en: "Gyeonggi" },
    busan: { ko: "부산", en: "Busan" },
  };
  const row = labels[primary];
  if (row) return isKo ? row.ko : row.en;
  return primary;
}

export function mapMixToDigitalRecommendResult(opts: {
  mix: IntegratedMixResponse;
  portfolio: MediaItem[];
  regions: string[];
  budgetMan: number;
  selectedChannelIds: DigitalChannelId[];
  digitalChannels?: DigitalChannel[];
  isKo: boolean;
}): DigitalRecommendResult {
  const { mix, portfolio, regions, budgetMan, selectedChannelIds, isKo } =
    opts;
  const channelPool = resolveDigitalChannels(opts.digitalChannels);
  const regionKo = regionLabel(regions, portfolio, true);
  const regionEn = regionLabel(regions, portfolio, false);
  const oohMediaName = portfolio[0]?.name ?? `${regionKo} OOH`;

  const digitalBudgetMan = Math.round(mix.allocation.digitalBudgetWon / 10_000);
  const monthlyMin = mix.digital.mix.kpis.impressionsMin;
  const monthlyMax =
    mix.digital.mix.kpis.impressionsMax ?? mix.digital.mix.kpis.impressionsMin;

  const byPlatform = new Map<
    DigitalChannelId,
    { budgetWon: number; budgetPct: number; reasonKo: string; reasonEn: string }
  >();

  for (const row of mix.digital.mix.channels) {
    const platformId = mixSlugToPlatformId(row.media.slug);
    if (!platformId) continue;
    const prev = byPlatform.get(platformId);
    if (prev) {
      byPlatform.set(platformId, {
        budgetWon: prev.budgetWon + row.budgetWon,
        budgetPct: prev.budgetPct + row.budgetPct,
        reasonKo: prev.reasonKo || row.reason,
        reasonEn: prev.reasonEn || row.reason,
      });
    } else {
      byPlatform.set(platformId, {
        budgetWon: row.budgetWon,
        budgetPct: row.budgetPct,
        reasonKo: row.reason,
        reasonEn: row.reason,
      });
    }
  }

  const pool =
    selectedChannelIds.length > 0
      ? channelPool.filter((c) => selectedChannelIds.includes(c.id))
      : channelPool;

  const channels: ScoredDigitalChannel[] = pool.map((channel, index) => {
    const row = byPlatform.get(channel.id);
    const budgetPct = row?.budgetPct ?? Math.round(100 / Math.max(1, pool.length));
    const channelBudgetWon =
      row?.budgetWon ??
      Math.round(mix.allocation.digitalBudgetWon / Math.max(1, pool.length));
    const share =
      mix.allocation.digitalBudgetWon > 0
        ? channelBudgetWon / mix.allocation.digitalBudgetWon
        : 1 / Math.max(1, pool.length);
    const estMin =
      monthlyMin != null ? Math.round(monthlyMin * share) : 0;
    const estMax =
      monthlyMax != null ? Math.round(monthlyMax * share) : estMin;

    return {
      channel,
      score: 100 - index,
      budgetPct,
      reasonKo: row?.reasonKo ?? channelReasonKo(channel, oohMediaName, regionKo),
      reasonEn: row?.reasonEn ?? channelReasonEn(channel, oohMediaName, regionEn),
      estimatedImpressions: Math.round((estMin + estMax) / 2),
    };
  });

  const lift = mix.integrated.synergyLiftMultiplier;
  return {
    channels,
    oohBudgetPct: mix.allocation.oohBudgetPct,
    digitalBudgetPct: mix.allocation.digitalBudgetPct,
    synergyMessageKo: mix.integrated.disclaimers.ko,
    synergyMessageEn: mix.integrated.disclaimers.en,
    primaryRegionLabelKo: regionKo,
    primaryRegionLabelEn: regionEn,
    brandLiftMultiplier: lift,
    totalDigitalBudgetMan: digitalBudgetMan,
  };
}

function channelReasonKo(
  channel: DigitalChannel,
  oohMediaName: string,
  regionKo: string,
): string {
  if (channel.id === "daangn") {
    return `${oohMediaName} + ${regionKo} 반경 1km 당근 광고 = 같은 사람에게 오프라인·온라인 이중 노출`;
  }
  if (channel.id === "buzzvil") {
    return `${oohMediaName} 노출 직후 폰 잠금화면에서 한 번 더 — 일 2억 노출로 리타겟`;
  }
  return channel.synergyKo;
}

function channelReasonEn(
  channel: DigitalChannel,
  oohMediaName: string,
  regionEn: string,
): string {
  if (channel.id === "daangn") {
    return `${oohMediaName} + Karrot ads within 1km of ${regionEn} = the same people reached both offline & online`;
  }
  if (channel.id === "buzzvil") {
    return `Right after ${oohMediaName}, retarget on the phone lockscreen — 200M daily impressions`;
  }
  return channel.synergyEn;
}

export function mergeMixIntoIntegratedMetrics(
  base: IntegratedCampaignMetrics,
  mix: IntegratedMixResponse,
  selectedChannelIds: DigitalChannelId[],
  digitalChannels?: DigitalChannel[],
): IntegratedCampaignMetrics {
  const channelPool = resolveDigitalChannels(digitalChannels);
  const monthlyClicksMin = mix.digital.mix.kpis.clicksMin;
  const monthlyClicksMax =
    mix.digital.mix.kpis.clicksMax ?? mix.digital.mix.kpis.clicksMin;
  const campaignMonths = Math.max(
    1,
    Math.round(mix.digital.mix.input.periodWeeks / 4),
  );

  const byPlatform = new Map<DigitalChannelId, number>();
  for (const row of mix.digital.mix.channels) {
    const platformId = mixSlugToPlatformId(row.media.slug);
    if (!platformId) continue;
    byPlatform.set(platformId, (byPlatform.get(platformId) ?? 0) + row.budgetWon);
  }

  const ids =
    selectedChannelIds.length > 0
      ? selectedChannelIds
      : [...byPlatform.keys()];

  const digitalChannelMetrics = ids.map((id) => {
    const ch = getDigitalChannelFromList(id, channelPool)!;
    const budgetWon =
      byPlatform.get(id) ??
      Math.round(mix.allocation.digitalBudgetWon / Math.max(1, ids.length));
    const budgetMan = Math.round(budgetWon / 10_000);
    const share =
      mix.allocation.digitalBudgetWon > 0
        ? budgetWon / mix.allocation.digitalBudgetWon
        : 1 / Math.max(1, ids.length);
    const clicksMid =
      monthlyClicksMin != null && monthlyClicksMax != null
        ? Math.round(((monthlyClicksMin + monthlyClicksMax) / 2) * campaignMonths * share)
        : Math.round(budgetWon / ch.avgCpcWon);
    const impressionsMid =
      mix.digital.mix.kpis.impressionsMin != null
        ? Math.round(
            ((mix.digital.mix.kpis.impressionsMin +
              (mix.digital.mix.kpis.impressionsMax ??
                mix.digital.mix.kpis.impressionsMin)) /
              2) *
              share,
          )
        : Math.round(clicksMid / Math.max(ch.ctr, 0.001));

    return {
      id,
      nameKo: ch.nameKo,
      nameEn: ch.nameEn,
      budgetMan,
      budgetWon,
      estimatedClicks: clicksMid,
      estimatedImpressions: impressionsMid,
      avgCpcWon: ch.avgCpcWon,
    };
  });

  const digitalTotalClicks = digitalChannelMetrics.reduce(
    (s, c) => s + c.estimatedClicks,
    0,
  );
  const digitalTotalImpressions =
    mix.digital.mix.kpis.impressionsMin != null
      ? Math.round(
          ((mix.digital.mix.kpis.impressionsMin +
            (mix.digital.mix.kpis.impressionsMax ??
              mix.digital.mix.kpis.impressionsMin)) /
            2) *
            campaignMonths,
        )
      : digitalChannelMetrics.reduce((s, c) => s + c.estimatedImpressions, 0);

  return {
    ...base,
    oohImpressions: mix.ooh.metrics.impressions,
    oohReach: mix.ooh.metrics.reach,
    oohCpmKrw: mix.ooh.metrics.cpmKrw,
    oohBudgetMan: Math.round(mix.allocation.oohBudgetWon / 10_000),
    digitalBudgetMan: Math.round(mix.allocation.digitalBudgetWon / 10_000),
    digitalChannels: digitalChannelMetrics,
    digitalTotalClicks,
    digitalTotalImpressions,
    synergyLiftMultiplier: mix.integrated.synergyLiftMultiplier,
  };
}
