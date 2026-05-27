import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import {
  DIGITAL_CHANNELS,
  OOH_DIGITAL_SYNERGY_LIFT,
  type DigitalChannel,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";

export type ScoredDigitalChannel = {
  channel: DigitalChannel;
  score: number;
  budgetPct: number;
  reasonKo: string;
  reasonEn: string;
  estimatedImpressions: number;
};

export type DigitalRecommendResult = {
  channels: ScoredDigitalChannel[];
  oohBudgetPct: number;
  digitalBudgetPct: number;
  synergyMessageKo: string;
  synergyMessageEn: string;
  primaryRegionLabelKo: string;
  primaryRegionLabelEn: string;
  brandLiftMultiplier: number;
  totalDigitalBudgetMan: number;
};

const REGION_LABELS_KO: Record<string, string> = {
  seoul: "서울",
  gyeonggi: "경기",
  incheon: "인천",
  busan: "부산",
  daegu: "대구",
  gwangju: "광주",
  daejeon: "대전",
  ulsan: "울산",
  gangwon: "강원",
  chungbuk: "충북",
  chungnam: "충남",
  jeonbuk: "전북",
  jeonnam: "전남",
  gyeongbuk: "경북",
  gyeongnam: "경남",
  jeju: "제주",
  gangnam: "강남",
};

const REGION_LABELS_EN: Record<string, string> = {
  seoul: "Seoul",
  gyeonggi: "Gyeonggi",
  incheon: "Incheon",
  busan: "Busan",
  daegu: "Daegu",
  gwangju: "Gwangju",
  daejeon: "Daejeon",
  ulsan: "Ulsan",
  gangwon: "Gangwon",
  chungbuk: "North Chungcheong",
  chungnam: "South Chungcheong",
  jeonbuk: "North Jeolla",
  jeonnam: "South Jeolla",
  gyeongbuk: "North Gyeongsang",
  gyeongnam: "South Gyeongsang",
  jeju: "Jeju",
  gangnam: "Gangnam",
};

function regionLabelKo(region: string, portfolio: MediaItem[]): string {
  const fromMedia = portfolio.find((m) => m.region)?.region?.trim();
  if (fromMedia) return fromMedia;
  return REGION_LABELS_KO[region] ?? region;
}

function regionLabelEn(region: string, portfolio: MediaItem[]): string {
  const fromMedia = portfolio.find((m) => m.region)?.region?.trim();
  if (fromMedia) return fromMedia;
  return REGION_LABELS_EN[region] ?? region;
}

function scoreChannel(
  channel: DigitalChannel,
  goal: PlannerCampaignGoal | null,
  regions: string[],
): number {
  const goalKey = goal ?? "brand";
  const affinity = channel.goalAffinity[goalKey] ?? 0.75;
  const regionBoost = regions.length > 0 ? 1 : 0.85;
  const localBoost =
    goal === "local" && (channel.id === "naver" || channel.id === "daangn")
      ? 1.08
      : 1;
  const launchBoost =
    goal === "launch" && (channel.id === "kakao" || channel.id === "google")
      ? 1.06
      : 1;
  const brandBoost =
    goal === "brand" && (channel.id === "meta" || channel.id === "tiktok")
      ? 1.05
      : 1;
  const eventBoost = goal === "event" && channel.id === "tiktok" ? 1.07 : 1;
  return (
    affinity * regionBoost * localBoost * launchBoost * brandBoost * eventBoost * 100
  );
}

export function recommendDigitalChannels(opts: {
  goal: PlannerCampaignGoal | null;
  regions: string[];
  portfolio: MediaItem[];
  budgetMan: number;
  digitalBudgetPct: number;
  selectedChannelIds: DigitalChannelId[];
}): DigitalRecommendResult {
  const { goal, regions, portfolio, budgetMan, digitalBudgetPct, selectedChannelIds } =
    opts;
  const primaryRegion = regions[0] ?? "seoul";
  const regionKo = regionLabelKo(primaryRegion, portfolio);
  const regionEn = regionLabelEn(primaryRegion, portfolio);
  const oohMediaName = portfolio[0]?.name ?? `${regionKo} OOH`;

  const pool =
    selectedChannelIds.length > 0
      ? DIGITAL_CHANNELS.filter((c) => selectedChannelIds.includes(c.id))
      : DIGITAL_CHANNELS;

  const scored = pool
    .map((channel) => ({
      channel,
      score: scoreChannel(channel, goal, regions),
    }))
    .sort((a, b) => b.score - a.score);

  const totalScore = scored.reduce((s, x) => s + x.score, 0) || 1;
  const digitalBudgetMan = Math.round(budgetMan * (digitalBudgetPct / 100));

  const channels: ScoredDigitalChannel[] = scored.map(({ channel, score }) => {
    const shareOfDigital = score / totalScore;
    const budgetPct = Math.round(shareOfDigital * digitalBudgetPct);
    const channelBudgetMan = Math.max(
      1,
      Math.round(digitalBudgetMan * shareOfDigital),
    );
    const budgetWon = channelBudgetMan * 10_000;
    const estimatedImpressions = Math.round(
      (budgetWon / Math.max(channel.avgCpmWon, 1)) * 1000,
    );
    return {
      channel,
      score,
      budgetPct,
      reasonKo: channel.synergyKo,
      reasonEn: channel.synergyEn,
      estimatedImpressions,
    };
  });

  const synergyMessageKo = `${oohMediaName} 집행 중 → ${regionKo} ${channels[0]?.channel.nameKo ?? "디지털"} 연계 시 브랜드 리프트 ${OOH_DIGITAL_SYNERGY_LIFT}배 (추정)`;
  const synergyMessageEn = `While running ${oohMediaName} → ${regionEn} + ${channels[0]?.channel.nameEn ?? "digital"} estimated ${OOH_DIGITAL_SYNERGY_LIFT}× brand lift`;

  return {
    channels,
    oohBudgetPct: 100 - digitalBudgetPct,
    digitalBudgetPct,
    synergyMessageKo,
    synergyMessageEn,
    primaryRegionLabelKo: regionKo,
    primaryRegionLabelEn: regionEn,
    brandLiftMultiplier: OOH_DIGITAL_SYNERGY_LIFT,
    totalDigitalBudgetMan: digitalBudgetMan,
  };
}

export function defaultDigitalChannelIds(): DigitalChannelId[] {
  return ["naver", "kakao", "meta"];
}
