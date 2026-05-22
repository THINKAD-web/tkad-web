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
  const localBoost = goal === "local" && channel.id === "naver_gfa" ? 1.08 : 1;
  const launchBoost = goal === "launch" && channel.id === "kakao_moment" ? 1.06 : 1;
  const brandBoost = goal === "brand" && channel.id === "meta_ig" ? 1.05 : 1;
  return affinity * regionBoost * localBoost * launchBoost * brandBoost * 100;
}

export function recommendDigitalChannels(opts: {
  goal: PlannerCampaignGoal | null;
  regions: string[];
  portfolio: MediaItem[];
  budgetMan: number;
  digitalBudgetPct: number;
}): DigitalRecommendResult {
  const { goal, regions, portfolio, digitalBudgetPct } = opts;
  const primaryRegion = regions[0] ?? "seoul";
  const regionKo = regionLabelKo(primaryRegion, portfolio);
  const regionEn = regionLabelEn(primaryRegion, portfolio);

  const oohMediaName = portfolio[0]?.name ?? `${regionKo} OOH`;

  const scored = DIGITAL_CHANNELS.map((channel) => {
    const score = scoreChannel(channel, goal, regions);
    return { channel, score };
  }).sort((a, b) => b.score - a.score);

  const totalScore = scored.reduce((s, x) => s + x.score, 0) || 1;
  const channels: ScoredDigitalChannel[] = scored.map(({ channel, score }) => {
    const budgetPct = Math.round((score / totalScore) * digitalBudgetPct);
    const reasonKo =
      channel.id === "naver_gfa"
        ? `${regionKo} 지역 검색·배너 타겟 — OOH 노출 후 브랜드 검색 전환`
        : channel.id === "kakao_moment"
          ? `${regionKo} 거주·방문 타겟 — 모바일 리마인드`
          : `${regionKo} 연령·관심사 타겟 — 비주얼 브랜딩`;
    const reasonEn =
      channel.id === "naver_gfa"
        ? `${regionEn} geo search & display — post-OOH brand search`
        : channel.id === "kakao_moment"
          ? `${regionEn} geo behavioral — mobile reminder`
          : `${regionEn} age & interest — visual branding`;
    return { channel, score, budgetPct, reasonKo, reasonEn };
  });

  const synergyMessageKo = `${oohMediaName} 집행 중 → ${regionKo} 지역 ${channels[0]?.channel.nameKo ?? "디지털"} 동시 집행 시 브랜드 리프트 ${OOH_DIGITAL_SYNERGY_LIFT}배 향상 (리서치 기반)`;
  const synergyMessageEn = `While running ${oohMediaName} → combined ${regionEn} ${channels[0]?.channel.nameEn ?? "digital"} lift brand impact ${OOH_DIGITAL_SYNERGY_LIFT}× (research benchmark)`;

  return {
    channels,
    oohBudgetPct: 100 - digitalBudgetPct,
    digitalBudgetPct,
    synergyMessageKo,
    synergyMessageEn,
    primaryRegionLabelKo: regionKo,
    primaryRegionLabelEn: regionEn,
    brandLiftMultiplier: OOH_DIGITAL_SYNERGY_LIFT,
  };
}

export function defaultDigitalChannelIds(): DigitalChannelId[] {
  return DIGITAL_CHANNELS.map((c) => c.id);
}
