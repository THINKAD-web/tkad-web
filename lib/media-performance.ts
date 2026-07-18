import type { MediaItem } from "@/lib/media-data";
import { resolveMonthlyImpressions } from "@/lib/media-metrics";

export type PerformanceDonutKey = "peak" | "standard" | "extended";

export type PerformanceBarKey = "reach" | "dwell" | "recall";

export type MediaPerformanceMetrics = {
  visibilityScore: number;
  monthlyImpressions: number;
  dailyFootfall: number;
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
