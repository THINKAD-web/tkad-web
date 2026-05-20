import type { MediaItem } from "@/lib/media-data";
import { getSimilarMediaFromCatalog, haversineKm } from "@/lib/media-data";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import {
  resolveTrafficPattern,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";
import type {
  AgeGenderDistribution,
  CompetitorOohInsight,
  DataSourceAttribution,
  EventSynergy,
  WeatherSensitivity,
} from "@/lib/data-source-types";
import { getFusedMediaData } from "@/lib/data-fusion";

export type TimeSlotHeatmap = {
  slot: "morning" | "afternoon" | "evening" | "night";
  labelKo: string;
  labelEn: string;
  index: number;
};

export type CommerceMix = {
  cafe: number;
  office: number;
  shopping: number;
  residential: number;
};

export type CompetitorRow = {
  id: string;
  name: string;
  cpmKrw: number | null;
  monthlyImpressions: number;
  visibilityScore: number;
  distanceKm: number;
};

export type SeasonIndex = {
  seasonKo: string;
  seasonEn: string;
  index: number;
  recommended: boolean;
};

export type TargetFitScores = {
  mz: number;
  office: number;
  family: number;
  tourist: number;
};

export type MediaAnalyticsReport = {
  timeSlots: TimeSlotHeatmap[];
  weeklyIndex: { dayKo: string; dayEn: string; index: number }[];
  commerce: CommerceMix;
  commerceInsightKo: string;
  commerceInsightEn: string;
  competitors: CompetitorRow[];
  seasons: SeasonIndex[];
  seasonInsightKo: string;
  seasonInsightEn: string;
  targets: TargetFitScores;
  targetInsightKo: string;
  targetInsightEn: string;
  isEstimated: boolean;
  /** data-fusion 통합 결과 */
  overallConfidence?: number;
  attributions?: DataSourceAttribution[];
  ageGender?: AgeGenderDistribution;
  weatherSensitivity?: WeatherSensitivity;
  weatherInsightKo?: string;
  weatherInsightEn?: string;
  eventSynergies?: EventSynergy[];
  competitorOoh?: CompetitorOohInsight[];
  methodologyKo?: string[];
  methodologyEn?: string[];
  fusedDailyFootfall?: number;
  fusedTrafficPattern?: StoredTrafficPattern;
};

const WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function estimateCpm(price: number, monthlyImpressions: number): number | null {
  if (monthlyImpressions <= 0 || price <= 0) return null;
  return Math.round(price / (monthlyImpressions / 1000));
}

function commerceMixForRegion(region: string, mediaType: string): CommerceMix {
  const r = region.toLowerCase();
  if (r.includes("강남") || r.includes("여의") || r.includes("판교")) {
    return { cafe: 15, office: 55, shopping: 20, residential: 10 };
  }
  if (r.includes("홍대") || r.includes("성수") || r.includes("이태")) {
    return { cafe: 35, office: 15, shopping: 30, residential: 20 };
  }
  if (r.includes("명동") || r.includes("종로") || r.includes("제주")) {
    return { cafe: 25, office: 10, shopping: 40, residential: 25 };
  }
  if (mediaType === "mobile" || mediaType === "network") {
    return { cafe: 20, office: 30, shopping: 25, residential: 25 };
  }
  return { cafe: 22, office: 38, shopping: 25, residential: 15 };
}

function commerceInsight(mix: CommerceMix, isKo: boolean): string {
  const dominant =
    mix.office >= 45
      ? "office"
      : mix.shopping >= 35
        ? "shopping"
        : mix.cafe >= 30
          ? "cafe"
          : "mixed";

  if (isKo) {
    if (dominant === "office")
      return "이 매체는 직장인 밀집 지역으로 평일 오전·점심 시간대 효과적";
    if (dominant === "shopping")
      return "쇼핑·관광 상권으로 주말·저녁 노출 효율이 높음";
    if (dominant === "cafe")
      return "MZ·트렌드 상권으로 저녁·주말 브랜드 인지 캠페인에 적합";
    return "복합 상권으로 평일·주말 균형 집행에 적합";
  }
  if (dominant === "office")
    return "Office-dense area — strongest on weekday mornings and lunch";
  if (dominant === "shopping")
    return "Retail/tourism district — weekends and evenings perform best";
  if (dominant === "cafe")
    return "Trend district — ideal for evening and weekend awareness";
  return "Mixed trade area — balanced weekday/weekend performance";
}

function targetScores(region: string, mediaType: string): TargetFitScores {
  const r = region.toLowerCase();
  let mz = 55;
  let office = 55;
  let family = 50;
  let tourist = 45;

  if (r.includes("홍대") || r.includes("성수")) mz = 92;
  if (r.includes("강남") || r.includes("여의") || r.includes("판교")) office = 88;
  if (r.includes("명동") || r.includes("제주")) tourist = 90;
  if (mediaType === "mobile") family = 72;
  if (mediaType === "digital") mz = Math.max(mz, 78);

  return { mz, office, family, tourist };
}

function targetInsight(scores: TargetFitScores, isKo: boolean): string {
  const entries = [
    { key: "mz", ko: "MZ", en: "Gen MZ", v: scores.mz },
    { key: "office", ko: "직장인", en: "Office workers", v: scores.office },
    { key: "family", ko: "가족", en: "Families", v: scores.family },
    { key: "tourist", ko: "관광객", en: "Tourists", v: scores.tourist },
  ];
  const top = [...entries].sort((a, b) => b.v - a.v)[0];
  if (isKo) return `타겟 적합도 최고: ${top.ko} (${top.v}점)`;
  return `Best target fit: ${top.en} (${top.v}/100)`;
}

function buildSeasons(monthly: number[]): SeasonIndex[] {
  const spring = (monthly[2] + monthly[3] + monthly[4]) / 3;
  const summer = (monthly[5] + monthly[6] + monthly[7]) / 3;
  const autumn = (monthly[8] + monthly[9] + monthly[10]) / 3;
  const winter = (monthly[11] + monthly[0] + monthly[1]) / 3;
  const avg = (spring + summer + autumn + winter) / 4;
  const toIndex = (v: number) => Math.round((v / avg) * 100);

  const seasons: SeasonIndex[] = [
    { seasonKo: "봄", seasonEn: "Spring", index: toIndex(spring), recommended: false },
    { seasonKo: "여름", seasonEn: "Summer", index: toIndex(summer), recommended: false },
    { seasonKo: "가을", seasonEn: "Autumn", index: toIndex(autumn), recommended: false },
    { seasonKo: "겨울", seasonEn: "Winter", index: toIndex(winter), recommended: false },
  ];
  const max = Math.max(...seasons.map((s) => s.index));
  seasons.forEach((s) => {
    s.recommended = s.index >= max - 5;
  });
  return seasons;
}

export function buildMediaAnalyticsReport(
  media: MediaItem,
  catalog: MediaItem[],
  stored: StoredTrafficPattern | null,
): MediaAnalyticsReport {
  const { pattern, isEstimated } = resolveTrafficPattern(
    stored,
    media.type,
    media.region,
  );
  const perf = resolvePerformanceMetrics(media);

  const morning = pattern.hourly.slice(6, 12).reduce((a, b) => a + b, 0);
  const afternoon = pattern.hourly.slice(12, 18).reduce((a, b) => a + b, 0);
  const evening = pattern.hourly.slice(18, 22).reduce((a, b) => a + b, 0);
  const night = [...pattern.hourly.slice(22, 24), ...pattern.hourly.slice(0, 6)].reduce(
    (a, b) => a + b,
    0,
  );
  const slotTotal = morning + afternoon + evening + night || 1;
  const toPct = (v: number) => Math.round((v / slotTotal) * 100);

  const timeSlots: TimeSlotHeatmap[] = [
    { slot: "morning", labelKo: "오전", labelEn: "Morning", index: toPct(morning) },
    { slot: "afternoon", labelKo: "오후", labelEn: "Afternoon", index: toPct(afternoon) },
    { slot: "evening", labelKo: "저녁", labelEn: "Evening", index: toPct(evening) },
    { slot: "night", labelKo: "심야", labelEn: "Late night", index: toPct(night) },
  ];

  const weeklyAvg =
    pattern.weekly.reduce((a, b) => a + b, 0) / pattern.weekly.length || 1;
  const weeklyIndex = pattern.weekly.map((w, i) => ({
    dayKo: WEEKDAY_KO[i] ?? String(i),
    dayEn: WEEKDAY_EN[i] ?? String(i),
    index: Math.round((w / weeklyAvg) * 100),
  }));

  const commerce = commerceMixForRegion(media.region, media.type);
  const targets = targetScores(media.region, media.type);
  const seasons = buildSeasons(pattern.monthly);

  const similar = getSimilarMediaFromCatalog(catalog, media, 4)
    .filter((m) => m.id !== media.id)
    .slice(0, 3);

  const competitors: CompetitorRow[] = similar.map((m) => {
    const mPerf = resolvePerformanceMetrics(m);
    return {
      id: m.id,
      name: m.name,
      cpmKrw: estimateCpm(m.price, mPerf.monthlyImpressions),
      monthlyImpressions: mPerf.monthlyImpressions,
      visibilityScore: mPerf.visibilityScore,
      distanceKm: Math.round(haversineKm(media, m) * 10) / 10,
    };
  });

  const bestSeason = [...seasons].sort((a, b) => b.index - a.index)[0];
  const seasonInsightKo = `${bestSeason.seasonKo} 시즌 지수 ${bestSeason.index} — 업종별 론칭·프로모션 권장`;
  const seasonInsightEn = `${bestSeason.seasonEn} index ${bestSeason.index} — recommended launch/promo season`;

  return {
    timeSlots,
    weeklyIndex,
    commerce,
    commerceInsightKo: commerceInsight(commerce, true),
    commerceInsightEn: commerceInsight(commerce, false),
    competitors,
    seasons,
    seasonInsightKo,
    seasonInsightEn,
    targets,
    targetInsightKo: targetInsight(targets, true),
    targetInsightEn: targetInsight(targets, false),
    isEstimated,
  };
}

/** 외부 데이터 소스 통합 후 분석 보고서 (매체 상세·PDF 공용) */
export async function buildMediaAnalyticsReportFused(
  media: MediaItem,
  catalog: MediaItem[],
  stored: StoredTrafficPattern | null,
): Promise<MediaAnalyticsReport> {
  const fused = await getFusedMediaData(media);
  const mergedStored: StoredTrafficPattern = {
    hourly: fused.trafficPattern.hourly,
    weekly: fused.trafficPattern.weekly,
    monthly: fused.trafficPattern.monthly,
    updatedAt: fused.trafficPattern.updatedAt,
  };

  const base = buildMediaAnalyticsReport(media, catalog, mergedStored);

  const targetsFromAge = ageToTargetScores(fused.ageGender);

  return {
    ...base,
    commerce: fused.commerce,
    isEstimated: fused.isEstimated,
    overallConfidence: fused.overallConfidence,
    attributions: fused.attributions,
    ageGender: fused.ageGender,
    weatherSensitivity: fused.weatherSensitivity,
    weatherInsightKo: fused.weatherInsightKo,
    weatherInsightEn: fused.weatherInsightEn,
    eventSynergies: fused.eventSynergies,
    competitorOoh: fused.competitorOoh,
    methodologyKo: fused.methodologyKo,
    methodologyEn: fused.methodologyEn,
    fusedDailyFootfall: fused.dailyFootfall,
    fusedTrafficPattern: mergedStored,
    targets: targetsFromAge,
    targetInsightKo: targetInsight(targetsFromAge, true),
    targetInsightEn: targetInsight(targetsFromAge, false),
  };
}

function ageToTargetScores(ag: AgeGenderDistribution): TargetFitScores {
  const mz = Math.min(100, ag.age20s + ag.age30s * 0.5);
  const office = Math.min(100, ag.age30s * 0.6 + ag.age40s * 0.4);
  const family = Math.min(100, ag.age40s * 0.5 + ag.age50plus * 0.3 + 20);
  const tourist = Math.min(100, 45 + ag.age20s * 0.2);
  return {
    mz: Math.round(mz),
    office: Math.round(office),
    family: Math.round(family),
    tourist: Math.round(tourist),
  };
}
