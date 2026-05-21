import type { MediaItem } from "@/lib/media-data";
import {
  resolveTrafficPattern,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";
import { estimateFootfallFromAdminDistrict } from "@/lib/footfall-district-heuristic";
import { collectSeoulOpenDataForMedia } from "@/lib/data-sources/seoul-open-data";
import { fetchSgisCommerceMix } from "@/lib/data-sources/sgis-api";
import { fetchKtBigdataFootfall } from "@/lib/data-sources/kt-bigdata";
import { fetchSktBigdataDemographics } from "@/lib/data-sources/skt-bigdata";
import {
  fetchKmaShortTerm,
  inferWeatherSensitivity,
  weatherImpactInsight,
} from "@/lib/data-sources/kma-weather";
import type {
  AgeGenderDistribution,
  DataSourceAttribution,
  EventSynergy,
  FusedMediaData,
  PartialSourcePayload,
} from "@/lib/data-source-types";
import { getCompetitorOohInsights } from "@/lib/competitor-ooh-monitor";
import { buildEventSynergies } from "@/lib/weather-event-impact";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";

const FUSION_MAX_AGE_MS = 30 * 86400_000;

function normalize(arr: number[], len: number): number[] {
  if (arr.length !== len) return Array(len).fill(1 / len);
  const sum = arr.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return Array(len).fill(1 / len);
  return arr.map((v) => Math.max(0, v) / sum);
}

function weightedMergePattern(
  sources: PartialSourcePayload[],
  fallback: { hourly: number[]; weekly: number[]; monthly: number[] },
): { hourly: number[]; weekly: number[]; monthly: number[] } {
  const merge = (key: "hourly" | "weekly" | "monthly", len: number) => {
    const acc = Array(len).fill(0);
    let wSum = 0;
    for (const s of sources) {
      const arr = s[key];
      if (!arr || arr.length !== len) continue;
      const w = s.weight * (s.confidence / 100);
      for (let i = 0; i < len; i++) acc[i] += (arr[i] ?? 0) * w;
      wSum += w;
    }
    if (wSum <= 0) return fallback[key];
    return normalize(
      acc.map((v) => v / wSum),
      len,
    );
  };
  return {
    hourly: merge("hourly", 24),
    weekly: merge("weekly", 7),
    monthly: merge("monthly", 12),
  };
}

function defaultAgeGender(region: string): AgeGenderDistribution {
  const r = region.toLowerCase();
  if (r.includes("홍대") || r.includes("성수")) {
    return { age20s: 42, age30s: 35, age40s: 15, age50plus: 8, male: 48, female: 52 };
  }
  if (r.includes("강남") || r.includes("여의")) {
    return { age20s: 18, age30s: 45, age40s: 25, age50plus: 12, male: 52, female: 48 };
  }
  return { age20s: 25, age30s: 35, age40s: 25, age50plus: 15, male: 49, female: 51 };
}

function mergeAgeGender(
  sources: PartialSourcePayload[],
  fallback: AgeGenderDistribution,
): AgeGenderDistribution {
  const withAg = sources.filter((s) => s.ageGender);
  if (!withAg.length) return fallback;
  const keys = [
    "age20s",
    "age30s",
    "age40s",
    "age50plus",
    "male",
    "female",
  ] as const;
  const out = { ...fallback };
  let wSum = 0;
  for (const s of withAg) {
    const w = s.weight * (s.confidence / 100);
    wSum += w;
    for (const k of keys) {
      out[k] += (s.ageGender![k] * w) / 100;
    }
  }
  if (wSum > 0) {
    for (const k of keys) out[k] = Math.round(out[k]);
  }
  return out;
}

function mergeCommerce(
  sources: PartialSourcePayload[],
  region: string,
  mediaType: string,
): FusedMediaData["commerce"] {
  const withC = sources.filter((s) => s.commerce);
  if (!withC.length) {
    const r = region.toLowerCase();
    if (r.includes("강남")) return { cafe: 15, office: 55, shopping: 20, residential: 10 };
    if (r.includes("홍대")) return { cafe: 35, office: 15, shopping: 30, residential: 20 };
    if (mediaType === "mobile") return { cafe: 20, office: 30, shopping: 25, residential: 25 };
    return { cafe: 22, office: 38, shopping: 25, residential: 15 };
  }
  const acc = { cafe: 0, office: 0, shopping: 0, residential: 0 };
  let wSum = 0;
  for (const s of withC) {
    const w = s.weight * (s.confidence / 100);
    wSum += w;
    acc.cafe += (s.commerce!.cafe * w) / 100;
    acc.office += (s.commerce!.office * w) / 100;
    acc.shopping += (s.commerce!.shopping * w) / 100;
    acc.residential += (s.commerce!.residential * w) / 100;
  }
  return {
    cafe: Math.round(acc.cafe),
    office: Math.round(acc.office),
    shopping: Math.round(acc.shopping),
    residential: Math.round(acc.residential),
  };
}

function toAttributions(sources: PartialSourcePayload[]): DataSourceAttribution[] {
  return sources.map((s) => ({
    sourceId: s.sourceId,
    labelKo: s.labelKo,
    labelEn: s.labelEn,
    level: s.level,
    confidenceScore: s.confidence,
  }));
}

function buildMethodology(
  attributions: DataSourceAttribution[],
  hasHeuristic: boolean,
): { ko: string[]; en: string[] } {
  const ko = attributions.map(
    (a) => `${a.labelKo} (신뢰도 ${a.confidenceScore}%)`,
  );
  const en = attributions.map(
    (a) => `${a.labelEn} (confidence ${a.confidenceScore}%)`,
  );
  if (hasHeuristic) {
    ko.push("THINKAD 통계·상권 추정 모델 (보조)");
    en.push("THINKAD statistical trade-area model (fallback)");
  }
  ko.push("데이터는 매월 1회 자동 갱신됩니다.");
  en.push("Data refreshed automatically on the 1st of each month.");
  return { ko, en };
}

async function collectAllSources(media: MediaItem): Promise<PartialSourcePayload[]> {
  const sources: PartialSourcePayload[] = [];

  try {
    if (media.lat && media.lng) {
      const [kt, skt, sgis] = await Promise.all([
        fetchKtBigdataFootfall({ latitude: media.lat, longitude: media.lng }),
        fetchSktBigdataDemographics({ latitude: media.lat, longitude: media.lng }),
        fetchSgisCommerceMix({
          latitude: media.lat,
          longitude: media.lng,
          district: media.district,
        }),
      ]);
      if (kt) sources.push(kt);
      if (skt) sources.push(skt);
      if (sgis) sources.push(sgis);
    }

    const seoul = await collectSeoulOpenDataForMedia({
      latitude: media.lat,
      longitude: media.lng,
      nearbyStations: media.nearbyStations,
      nearbyLandmarks: media.nearbyLandmarks ?? media.location,
      district: media.district,
    });
    sources.push(...seoul);
  } catch (e) {
    console.warn("[data-fusion] collectAllSources failed", media.id, e);
  }

  if (media.dailyFootTraffic && media.dailyFootTraffic > 0) {
    sources.push({
      sourceId: "thinkad_internal",
      weight: 0.5,
      confidence: 95,
      dailyFootfall: media.dailyFootTraffic,
      labelKo: "THINKAD 매체 등록 데이터",
      labelEn: "THINKAD registered media data",
      level: "high",
    });
  }

  return sources;
}

export async function fuseMediaData(media: MediaItem): Promise<FusedMediaData> {
  const stored = media.trafficPattern as StoredTrafficPattern | null | undefined;
  const { pattern: fallbackPattern, isEstimated } = resolveTrafficPattern(
    stored ?? null,
    media.type,
    media.region,
  );

  const sources = await collectAllSources(media);
  const hasRealSource = sources.some((s) => s.sourceId !== "thinkad_internal");

  let dailyFootfall = media.dailyFootTraffic ?? 0;
  if (sources.length) {
    let wSum = 0;
    let acc = 0;
    for (const s of sources) {
      if (s.dailyFootfall == null) continue;
      const w = s.weight * (s.confidence / 100);
      acc += s.dailyFootfall * w;
      wSum += w;
    }
    if (wSum > 0) dailyFootfall = Math.round(acc / wSum);
  }
  if (dailyFootfall <= 0) {
    dailyFootfall = estimateFootfallFromAdminDistrict({
      city: media.city,
      district: media.district,
    });
    sources.push({
      sourceId: "heuristic",
      weight: 0.3,
      confidence: 78,
      dailyFootfall,
      labelKo: "통계 기반 추정",
      labelEn: "Statistical estimate",
      level: "estimated",
    });
  }

  const mergedPattern = weightedMergePattern(sources, fallbackPattern);
  const ageGender = mergeAgeGender(sources, defaultAgeGender(media.region));
  const commerce = mergeCommerce(sources, media.region, media.type);
  const attributions = toAttributions(sources);

  const overallConfidence =
    sources.length > 0
      ? Math.round(
          sources.reduce((s, x) => s + x.confidence * x.weight, 0) /
            sources.reduce((s, x) => s + x.weight, 0),
        )
      : 78;

  const weatherSensitivity = inferWeatherSensitivity(media.type, media.location);
  const weatherSnap =
    media.lat && media.lng
      ? await fetchKmaShortTerm({ latitude: media.lat, longitude: media.lng })
      : null;
  const weatherInsight = weatherImpactInsight(
    weatherSensitivity,
    weatherSnap,
    true,
  );

  const eventSynergies: EventSynergy[] = buildEventSynergies(media);
  const competitorOoh = await getCompetitorOohInsights(media.region ?? "서울");

  const methodology = buildMethodology(
    attributions,
    isEstimated || !hasRealSource,
  );

  return {
    mediaId: media.id,
    dailyFootfall,
    trafficPattern: {
      hourly: mergedPattern.hourly,
      weekly: mergedPattern.weekly,
      monthly: mergedPattern.monthly,
      updatedAt: new Date().toISOString(),
      sources: sources.map((s) => s.sourceId),
    },
    ageGender,
    commerce,
    attributions,
    overallConfidence,
    isEstimated: !hasRealSource || isEstimated,
    weatherSensitivity,
    weatherInsightKo: weatherInsight.ko,
    weatherInsightEn: weatherInsight.en,
    eventSynergies,
    methodologyKo: methodology.ko,
    methodologyEn: methodology.en,
    competitorOoh,
  };
}

export async function getFusedMediaData(
  media: MediaItem,
  opts?: { forceRefresh?: boolean },
): Promise<FusedMediaData> {
  if (isDatabaseConfigured() && !opts?.forceRefresh) {
    const db = getPrisma();
    try {
      const cached = await db.mediaDataFusion.findUnique({
        where: { mediaId: media.id },
      });
      if (
        cached &&
        Date.now() - cached.refreshedAt.getTime() < FUSION_MAX_AGE_MS
      ) {
        return cached.payload as unknown as FusedMediaData;
      }
    } catch (e) {
      if (!isMissingContentTableError(e)) throw e;
    }
  }

  const fused = await fuseMediaData(media);

  if (isDatabaseConfigured()) {
    const db = getPrisma();
    try {
      await db.mediaDataFusion.upsert({
        where: { mediaId: media.id },
        create: {
          mediaId: media.id,
          payload: fused as object,
          confidence: fused.overallConfidence,
          sources: fused.trafficPattern.sources,
          refreshedAt: new Date(),
        },
        update: {
          payload: fused as object,
          confidence: fused.overallConfidence,
          sources: fused.trafficPattern.sources,
          refreshedAt: new Date(),
        },
      });
    } catch (e) {
      if (!isMissingContentTableError(e)) throw e;
    }
  }

  return fused;
}

export async function refreshAllMediaFusion(limit = 200): Promise<number> {
  if (!isDatabaseConfigured()) return 0;
  const db = getPrisma();
  const { fetchPublicMediaCatalog } = await import("@/lib/public-media-catalog");
  const catalog = await fetchPublicMediaCatalog();
  let count = 0;
  for (const m of catalog.slice(0, limit)) {
    try {
      await getFusedMediaData(m, { forceRefresh: true });
      count++;
    } catch (e) {
      console.warn("[data-fusion] refresh failed", m.id, e);
    }
  }
  return count;
}
