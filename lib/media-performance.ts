import type { MediaItem } from "@/lib/media-data";
import { resolveMonthlyImpressions } from "@/lib/media-metrics";
import type { MetricBasis } from "@/lib/metrics/defaults";
import {
  resolveContactRateWithBasis,
  resolveSovShareWithBasis,
  weakestBasis,
} from "@/lib/metrics/defaults";
import { calcImpressions } from "@/lib/metrics/impressions";

export type PerformanceDonutKey = "peak" | "standard" | "extended";

export type PerformanceBarKey = "reach" | "dwell" | "recall";

/**
 * 일 실노출(추정) — 접촉률·SOV 보정을 반영한, 실제로 내 광고를 보는 사람 수.
 *
 * `dailyFootfall` 은 매체 앞을 **지나간** 사람(OTS)이라 실노출과 유형별로
 * 최대 20배까지 차이 난다. 상세 화면이 유동인구만 보여주면 광고주가 그 수를
 * 노출로 오해하므로 둘을 나란히 놓는다.
 *
 * SOV 근거가 없으면 `resolveSovShareWithBasis` 가 기본값으로 덮되 basis 를
 * `default` 로 실어 보낸다 — 화면은 그 basis 로 [추정] 배지를 띄운다.
 * 유동인구 자체가 없으면 계산 대상이 아니므로 null 이다.
 */
export type DailyAdjustedReach = {
  value: number;
  basis: MetricBasis;
};

function mediaSovSource(media: MediaItem) {
  return {
    type: media.type,
    subCategory: media.subCategory ?? media.mediaSubCategory,
    mainCategory: media.mediaCategory?.[0],
    name: media.name,
    forceLoopSov: media.forceLoopSov,
    spotDuration: media.spotDurationSec,
    loopDuration: media.loopDurationSec,
    playsPerHour: media.playsPerHour,
  };
}

export function resolveDailyAdjustedReach(
  media: MediaItem,
): DailyAdjustedReach | null {
  const traffic = media.dailyFootTraffic;
  if (!Number.isFinite(traffic) || traffic <= 0) return null;

  const contactRate = resolveContactRateWithBasis({
    type: media.type,
    subCategory: media.subCategory ?? media.mediaSubCategory,
    mainCategory: media.mediaCategory?.[0],
    name: media.name,
  });
  const sovShare = resolveSovShareWithBasis(mediaSovSource(media));

  const { dailyImpressions } = calcImpressions({
    dailyTraffic: traffic,
    contactRate: contactRate.value,
    sovShare: sovShare.value,
    units: 1,
    days: 1,
  });

  if (dailyImpressions <= 0) return null;

  return {
    value: dailyImpressions,
    basis: weakestBasis([contactRate.basis, sovShare.basis]),
  };
}

export type MediaPerformanceMetrics = {
  visibilityScore: number;
  monthlyImpressions: number;
  dailyFootfall: number;
  /** 접촉률·SOV 보정 일 실노출. 유동인구가 없으면 null */
  dailyAdjustedReach: DailyAdjustedReach | null;
  donut: readonly {
    key: PerformanceDonutKey;
    percent: number;
    color: string;
  }[];
  bars: readonly { key: PerformanceBarKey; value: number }[];
};

/** Deterministic reference metrics for detail UI (not a measurement guarantee). */
export function resolvePerformanceMetrics(media: MediaItem): MediaPerformanceMetrics {
  // SSOT: impressions ?? monthlyFootTraffic ?? daily×30 (버그 #1 수정)
  const monthly = resolveMonthlyImpressions(media);
  const idHash = media.id
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const seed = idHash * 1103 + (media.dailyFootTraffic % 997);
  
  // DB 값 우선 사용, 없으면 해시로 생성
  const visibilityScore = media.visibilityScore ?? (58 + (seed % 35));
  
  // reach: DB 값을 0-100 스케일로 변환 (백분율로 표시)
  // DB reach가 있으면 월노출 대비 비율로 계산, 없으면 해시
  const impressions = monthly;
  const reachValue = media.reach != null && impressions > 0
    ? Math.min(98, Math.round((media.reach / impressions) * 100))
    : (52 + (seed % 42));
  
  // frequency를 dwell로 사용 (체류/반복 노출 지표)
  // DB frequency가 있으면 10 기준 백분율, 없으면 해시
  const dwellValue = media.frequency != null
    ? Math.min(98, Math.round(media.frequency * 10))
    : (48 + ((seed * 5) % 44));
  
  // engagementRate를 recall로 사용 (기억/인지 지표)
  // DB engagementRate가 있으면 100배 백분율, 없으면 해시
  const recallValue = media.engagementRate != null
    ? Math.min(98, Math.round(media.engagementRate * 100))
    : (50 + ((seed * 7) % 41));

  // 도넛 차트 (시간대별 노출) - 해시 기반 유지 (DB에 해당 필드 없음)
  let peak = 32 + (seed % 26);
  let standard = 24 + ((seed >> 3) % 28);
  let extended = 100 - peak - standard;
  if (extended < 14) {
    const need = 14 - extended;
    peak = Math.max(26, peak - Math.ceil(need / 2));
    standard = Math.max(18, standard - Math.floor(need / 2));
    extended = 100 - peak - standard;
  }

  return {
    visibilityScore,
    monthlyImpressions: monthly,
    dailyFootfall: media.dailyFootTraffic,
    dailyAdjustedReach: resolveDailyAdjustedReach(media),
    donut: [
      // Premium neon palette (matches landing day/night)
      { key: "peak", percent: peak, color: "#a855f7" }, // violet
      { key: "standard", percent: standard, color: "#22d3ee" }, // cyan
      { key: "extended", percent: extended, color: "#ec4899" }, // pink
    ],
    bars: [
      { key: "reach", value: Math.min(98, reachValue) },
      { key: "dwell", value: Math.min(98, dwellValue) },
      { key: "recall", value: Math.min(98, recallValue) },
    ],
  };
}

export function donutConicGradient(
  segments: readonly { percent: number; color: string }[],
): string {
  let deg = 0;
  const parts: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const sweepDeg =
      i === segments.length - 1 ? 360 - deg : (s.percent / 100) * 360;
    const next = deg + sweepDeg;
    parts.push(`${s.color} ${deg}deg ${next}deg`);
    deg = next;
  }
  return `conic-gradient(${parts.join(", ")})`;
}
