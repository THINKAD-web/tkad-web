import type { MediaItem } from "@/lib/media-data";

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
  const monthly =
    media.monthlyFootTraffic ?? Math.round(media.dailyFootTraffic * 30);
  const idHash = media.id
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const seed = idHash * 1103 + (media.dailyFootTraffic % 997);
  const visibilityScore = 58 + (seed % 35);

  let peak = 32 + (seed % 26);
  let standard = 24 + ((seed >> 3) % 28);
  let extended = 100 - peak - standard;
  if (extended < 14) {
    const need = 14 - extended;
    peak = Math.max(26, peak - Math.ceil(need / 2));
    standard = Math.max(18, standard - Math.floor(need / 2));
    extended = 100 - peak - standard;
  }

  const reach = 52 + (seed % 42);
  const dwell = 48 + ((seed * 5) % 44);
  const recall = 50 + ((seed * 7) % 41);

  return {
    visibilityScore,
    monthlyImpressions: monthly,
    dailyFootfall: media.dailyFootTraffic,
    donut: [
      { key: "peak", percent: peak, color: "#1a2a6c" },
      { key: "standard", percent: standard, color: "#c9b896" },
      { key: "extended", percent: extended, color: "#94a3b8" },
    ],
    bars: [
      { key: "reach", value: Math.min(98, reach) },
      { key: "dwell", value: Math.min(98, dwell) },
      { key: "recall", value: Math.min(98, recall) },
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
