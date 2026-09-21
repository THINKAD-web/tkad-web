import type { MediaItem } from "@/lib/media-data";
import { MODEL_VERSIONS } from "@/lib/media/engine/constants";
import { classifyMedia } from "@/lib/metrics/classify";
import { DAYS_PER_MONTH } from "@/lib/metrics/constants";
import { calcImpressions } from "@/lib/metrics/impressions";
import {
  resolveContactRateWithBasis,
  resolveSovShareWithBasis,
} from "@/lib/metrics/defaults";

export type MonthlyImpressionsInput = {
  impressions?: number | null;
  monthlyFootTraffic?: number | null;
  dailyFootTraffic?: number | null;
  /** MediaComputedMetric.dailyImpressions (detail/catalog when loaded) */
  engineDailyImpressions?: number | null;
  impressionModelVersion?: string | null;
  /** v1 SOV/contact inputs when available (detail) */
  mediaType?: string;
  mediaSubCategory?: string | null;
  mediaMainCategory?: string | null;
  mediaName?: string;
  factSheet?: {
    forceLoopSov?: boolean | null;
    spotDurationSec?: number | null;
    loopDurationSec?: number | null;
    playsPerHour?: number | null;
  } | null;
};

export function dailyFootfallMirrorsEngineDaily(
  dailyFootfall: number,
  engineDaily: number | null | undefined,
): boolean {
  if (engineDaily == null || engineDaily <= 0 || dailyFootfall <= 0) return false;
  return engineDaily === dailyFootfall;
}

/** 일 유동을 그대로 일 노출로 저장한 v0-fallback 흔적 */
export function storedMonthlyLikelyFootTrafficProxy(
  monthlyStored: number,
  dailyFootfall: number,
): boolean {
  if (monthlyStored <= 0 || dailyFootfall <= 0) return false;
  const monthFromDaily = Math.round(dailyFootfall * DAYS_PER_MONTH);
  if (monthlyStored === dailyFootfall) return true;
  if (monthlyStored === monthFromDaily) return true;
  return false;
}

function estimateMonthlyImpressionsFromFootfall(
  input: MonthlyImpressionsInput,
): number {
  const foot = input.dailyFootTraffic ?? 0;
  if (foot <= 0) return 0;

  const mediaClass = classifyMedia({
    type: input.mediaType ?? "DOOH",
    subCategory: input.mediaSubCategory ?? undefined,
    mainCategory: input.mediaMainCategory ?? undefined,
    name: input.mediaName ?? "",
  });

  const contact = resolveContactRateWithBasis({
    type: input.mediaType ?? "DOOH",
    subCategory: input.mediaSubCategory ?? undefined,
    mainCategory: input.mediaMainCategory ?? undefined,
    name: input.mediaName ?? "",
  });

  const fs = input.factSheet;
  const sov = resolveSovShareWithBasis({
    type: input.mediaType ?? "DOOH",
    subCategory: input.mediaSubCategory ?? undefined,
    mainCategory: input.mediaMainCategory ?? undefined,
    name: input.mediaName ?? "",
    forceLoopSov: fs?.forceLoopSov ?? undefined,
    spotDuration: fs?.spotDurationSec ?? undefined,
    loopDuration: fs?.loopDurationSec ?? undefined,
    playsPerHour: fs?.playsPerHour ?? undefined,
  });

  if (sov.value <= 0) {
    return Math.round(foot * DAYS_PER_MONTH);
  }

  const { totalImpressions } = calcImpressions({
    dailyTraffic: foot,
    contactRate: contact.value,
    sovShare: sov.value,
    units: 1,
    days: DAYS_PER_MONTH,
  });

  void mediaClass;
  return totalImpressions > 0 ? totalImpressions : Math.round(foot * DAYS_PER_MONTH);
}

/**
 * 광고주-facing 월 노출 SSOT.
 * - v1 엔진 daily × 30 우선
 * - stored `impressions` 가 유동인구 proxy 이면 v1 추정 OTS 로 대체
 * - v0 에서 dailyImpressions === dailyFootfall 이면 stored 무시
 */
export function resolvePublicMonthlyImpressions(
  input: MonthlyImpressionsInput,
): number {
  const foot = input.dailyFootTraffic ?? 0;
  const stored = input.impressions ?? input.monthlyFootTraffic ?? 0;
  const engineDaily = input.engineDailyImpressions ?? 0;
  const version = input.impressionModelVersion ?? "";

  if (
    engineDaily > 0 &&
    (version === MODEL_VERSIONS.V1_IMPRESSIONS ||
      version.startsWith("v1"))
  ) {
    return Math.round(engineDaily * DAYS_PER_MONTH);
  }

  const footMirrorsEngine = dailyFootfallMirrorsEngineDaily(foot, engineDaily);
  const storedIsProxy =
    stored > 0 && foot > 0 && storedMonthlyLikelyFootTrafficProxy(stored, foot);

  if (
    footMirrorsEngine &&
    version === MODEL_VERSIONS.V0_FALLBACK &&
    stored > 0
  ) {
    return estimateMonthlyImpressionsFromFootfall(input);
  }

  if (stored > 0 && !storedIsProxy) {
    return Math.round(stored);
  }

  if (foot > 0) {
    return Math.round(foot * DAYS_PER_MONTH);
  }

  if (engineDaily > 0) {
    return Math.round(engineDaily * DAYS_PER_MONTH);
  }

  return 0;
}

export function mediaItemToImpressionsInput(
  media: MediaItem,
): MonthlyImpressionsInput {
  const cm = media.computedMetric;
  return {
    impressions: media.impressions,
    monthlyFootTraffic: media.monthlyFootTraffic,
    dailyFootTraffic: media.dailyFootTraffic,
    engineDailyImpressions: cm?.dailyImpressions,
    impressionModelVersion: cm?.modelVersion,
    mediaType: media.type,
    mediaSubCategory: media.subCategory,
    mediaMainCategory: media.mediaMainCategory,
    mediaName: media.name,
    factSheet: media.factSheet ?? null,
  };
}

/** 스펙·본문용 월 유동인구(참고) — 일 유동 × 30 */
export function resolveMonthlyFootTrafficReference(
  dailyFootfall: number | null | undefined,
): number {
  if (dailyFootfall == null || !Number.isFinite(dailyFootfall) || dailyFootfall <= 0) {
    return 0;
  }
  return Math.round(dailyFootfall * DAYS_PER_MONTH);
}
