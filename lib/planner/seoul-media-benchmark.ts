import type { MediaItem } from "@/lib/media-data";
import { resolveCpmWonForDisplayFromMediaItem } from "@/lib/media-metrics";
import { classifyMedia } from "@/lib/metrics/classify";
import { isCpmInRange } from "@/lib/metrics/cpm";
import type { MediaMetricClass } from "@/lib/metrics/types";
import type { PlannerExportMediaRow } from "@/lib/planner-report-export/types";

/** 보고서용 서울 유형 버킷 — 지하철 PSD·light 통합 */
export type SeoulBenchmarkBucket = "bus_shelter" | "subway" | "bus_exterior";

export const SEOUL_BENCHMARK_MIN_SAMPLES = 5;

export type SeoulBucketBenchmarkStats = {
  bucket: SeoulBenchmarkBucket;
  /** in-range CPM 표본 */
  nCpm: number;
  nFootfall: number;
  medianCpm: number | null;
  medianFootfall: number | null;
  /** nCpm >= SEOUL_BENCHMARK_MIN_SAMPLES */
  cpmComparable: boolean;
  footfallComparable: boolean;
};

export type SeoulTypeBenchmarkIndex = Record<
  SeoulBenchmarkBucket,
  SeoulBucketBenchmarkStats
>;

const BUCKET_LABEL_KO: Record<SeoulBenchmarkBucket, string> = {
  bus_shelter: "버스쉘터",
  subway: "지하철",
  bus_exterior: "버스외부",
};

const BUCKET_LABEL_EN: Record<SeoulBenchmarkBucket, string> = {
  bus_shelter: "bus shelter",
  subway: "subway",
  bus_exterior: "bus exterior",
};

function isSeoulMedia(m: MediaItem): boolean {
  if (m.regionMain?.trim() === "seoul") return true;
  return m.region === "seoul";
}

export function seoulBenchmarkBucketForMedia(
  m: Pick<
    MediaItem,
    | "type"
    | "subCategory"
    | "mediaSubCategory"
    | "mediaMainCategory"
    | "name"
    | "widthM"
    | "heightM"
  >,
): SeoulBenchmarkBucket | null {
  const cls = classifyMedia({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaMainCategory,
    name: m.name,
    widthM: m.widthM,
    heightM: m.heightM,
  });
  if (cls === "bus_shelter") return "bus_shelter";
  if (cls === "bus_exterior") return "bus_exterior";
  if (cls === "subway_psd" || cls === "subway_light") return "subway";
  return null;
}

/**
 * 공개 카탈로그 1유닛 기준 CPM — `resolveCpmWonForDisplay` + 노출 SSOT (#615/#616).
 */
export function catalogMonthlyReferenceCpm(m: MediaItem): {
  cpm: number;
  mediaClass: MediaMetricClass;
} | null {
  const mediaClass = classifyMedia({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaMainCategory,
    name: m.name,
    widthM: m.widthM,
    heightM: m.heightM,
  });
  const cpm = resolveCpmWonForDisplayFromMediaItem(m);
  if (cpm == null || cpm <= 0) return null;
  if (!isCpmInRange(cpm, mediaClass)) return null;
  return { cpm, mediaClass };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function emptyBucketStats(bucket: SeoulBenchmarkBucket): SeoulBucketBenchmarkStats {
  return {
    bucket,
    nCpm: 0,
    nFootfall: 0,
    medianCpm: null,
    medianFootfall: null,
    cpmComparable: false,
    footfallComparable: false,
  };
}

export function computeSeoulTypeBenchmarks(
  catalog: readonly MediaItem[],
): SeoulTypeBenchmarkIndex {
  const buckets: Record<
    SeoulBenchmarkBucket,
    { cpms: number[]; footfalls: number[] }
  > = {
    bus_shelter: { cpms: [], footfalls: [] },
    subway: { cpms: [], footfalls: [] },
    bus_exterior: { cpms: [], footfalls: [] },
  };

  for (const m of catalog) {
    if (!isSeoulMedia(m)) continue;
    const bucket = seoulBenchmarkBucketForMedia(m);
    if (!bucket) continue;
    const foot = m.dailyFootTraffic ?? 0;
    if (foot > 0) buckets[bucket].footfalls.push(foot);
    const ref = catalogMonthlyReferenceCpm(m);
    if (ref) buckets[bucket].cpms.push(ref.cpm);
  }

  const out = {} as SeoulTypeBenchmarkIndex;
  for (const key of ["bus_shelter", "subway", "bus_exterior"] as const) {
    const { cpms, footfalls } = buckets[key];
    const nCpm = cpms.length;
    const nFootfall = footfalls.length;
    out[key] = {
      bucket: key,
      nCpm,
      nFootfall,
      medianCpm: median(cpms),
      medianFootfall: median(footfalls),
      cpmComparable: nCpm >= SEOUL_BENCHMARK_MIN_SAMPLES,
      footfallComparable: nFootfall >= SEOUL_BENCHMARK_MIN_SAMPLES,
    };
  }
  return out;
}

function pctVsMedian(value: number, med: number): number {
  if (med <= 0) return 0;
  return Math.round(((value - med) / med) * 100);
}

function formatPctLine(pct: number, isKo: boolean): string {
  if (Math.abs(pct) < 3) {
    return isKo ? "평균 수준" : "near median";
  }
  if (pct > 0) {
    return isKo ? `${pct}% 높음` : `${pct}% above median`;
  }
  return isKo ? `${Math.abs(pct)}% 낮음` : `${Math.abs(pct)}% below median`;
}

export const SEOUL_BENCHMARK_INSUFFICIENT_KO =
  "표본 부족으로 비교 어려움";
export const SEOUL_BENCHMARK_INSUFFICIENT_EN =
  "Insufficient sample for comparison";

export function seoulBenchmarkFootnote(isKo: boolean): string {
  return isKo
    ? "서울 유형별 비교는 공개 카탈로그 월 1유닛 기준 참고 CPM·일 유동(OTS) 중앙값이며, 실제 집행 조건·기간에 따라 달라질 수 있습니다."
    : "Seoul type benchmarks use public-catalog monthly 1-unit reference CPM and daily OTS medians; actual flight terms may differ.";
}

export type SeoulCpmBenchmarkBadge =
  | { kind: "compare"; shortLabel: string; fullLabel: string }
  | { kind: "insufficient"; shortLabel: string; fullLabel: string }
  | null;

function buildCpmBenchmarkLabel(args: {
  lineCpm: number;
  stats: SeoulBucketBenchmarkStats;
  typeLabel: string;
  isKo: boolean;
}): string | undefined {
  const { lineCpm, stats, typeLabel, isKo } = args;
  const insufficient = isKo
    ? SEOUL_BENCHMARK_INSUFFICIENT_KO
    : SEOUL_BENCHMARK_INSUFFICIENT_EN;

  if (stats.cpmComparable && stats.medianCpm != null) {
    const pct = formatPctLine(pctVsMedian(lineCpm, stats.medianCpm), isKo);
    const cpmFmt = lineCpm.toLocaleString(isKo ? "ko-KR" : "en-US");
    const medFmt = stats.medianCpm.toLocaleString(isKo ? "ko-KR" : "en-US");
    return isKo
      ? `이 매체 CPM ₩${cpmFmt} — 서울 ${typeLabel} 평균(중앙값) ₩${medFmt} 대비 ${pct} (n=${stats.nCpm})`
      : `CPM ₩${cpmFmt} — vs Seoul ${typeLabel} median ₩${medFmt}: ${pct} (n=${stats.nCpm})`;
  }
  return isKo
    ? `서울 ${typeLabel} CPM 벤치마크: ${insufficient}`
    : `Seoul ${typeLabel} CPM benchmark: ${insufficient}`;
}

/** 매체 상세 히어로 배지 — 서울 3버킷만, DOOH 등은 null */
export function seoulCpmBenchmarkBadgeForMedia(
  media: MediaItem,
  catalog: readonly MediaItem[],
  isKo: boolean,
): SeoulCpmBenchmarkBadge {
  if (!isSeoulMedia(media)) return null;
  const bucket = seoulBenchmarkBucketForMedia(media);
  if (!bucket) return null;

  const lineCpm = resolveCpmWonForDisplayFromMediaItem(media);
  if (lineCpm == null || lineCpm <= 0) return null;

  const stats =
    computeSeoulTypeBenchmarks(catalog)[bucket] ?? emptyBucketStats(bucket);
  const typeLabel = isKo ? BUCKET_LABEL_KO[bucket] : BUCKET_LABEL_EN[bucket];
  const fullLabel = buildCpmBenchmarkLabel({
    lineCpm,
    stats,
    typeLabel,
    isKo,
  });
  if (!fullLabel) return null;

  if (!stats.cpmComparable) {
    return {
      kind: "insufficient",
      shortLabel: isKo
        ? `서울 ${typeLabel} · ${SEOUL_BENCHMARK_INSUFFICIENT_KO}`
        : `Seoul ${typeLabel} · ${SEOUL_BENCHMARK_INSUFFICIENT_EN}`,
      fullLabel,
    };
  }

  const pct = pctVsMedian(lineCpm, stats.medianCpm!);
  const pctText = formatPctLine(pct, isKo);
  return {
    kind: "compare",
    shortLabel: isKo
      ? `서울 ${typeLabel} 중앙값 대비 ${pctText}`
      : `vs Seoul ${typeLabel} median: ${pctText}`,
    fullLabel,
  };
}

type AttachArgs = {
  portfolioRows: PlannerExportMediaRow[];
  catalog: readonly MediaItem[];
  planItems: readonly { id: string; cpmWon: number | null }[];
  isKo: boolean;
};

export function attachSeoulBenchmarksToPortfolioRows(
  args: AttachArgs,
): PlannerExportMediaRow[] {
  const benchmarks = computeSeoulTypeBenchmarks(args.catalog);
  const catalogById = new Map(args.catalog.map((m) => [m.id, m]));
  const cpmById = new Map(
    args.planItems.map((pi) => [pi.id, pi.cpmWon] as const),
  );

  return args.portfolioRows.map((row) => {
    if (row.kind === "custom" || !row.id) return row;
    const media = catalogById.get(row.id);
    if (!media) return row;
    const bucket = seoulBenchmarkBucketForMedia(media);
    if (!bucket) return row;
    const stats = benchmarks[bucket] ?? emptyBucketStats(bucket);
    const typeLabel = args.isKo ? BUCKET_LABEL_KO[bucket] : BUCKET_LABEL_EN[bucket];

    let cpmBenchmarkLabel: string | undefined;
    const lineCpm =
      resolveCpmWonForDisplayFromMediaItem(media) ??
      cpmById.get(row.id) ??
      null;
    if (lineCpm != null && lineCpm > 0) {
      cpmBenchmarkLabel = buildCpmBenchmarkLabel({
        lineCpm,
        stats,
        typeLabel,
        isKo: args.isKo,
      });
    }

    let footfallBenchmarkLabel: string | undefined;
    const foot = row.dailyTraffic ?? media.dailyFootTraffic ?? 0;
    if (foot > 0) {
      const insufficient = args.isKo
        ? SEOUL_BENCHMARK_INSUFFICIENT_KO
        : SEOUL_BENCHMARK_INSUFFICIENT_EN;
      if (stats.footfallComparable && stats.medianFootfall != null) {
        const pct = formatPctLine(
          pctVsMedian(foot, stats.medianFootfall),
          args.isKo,
        );
        const footFmt = foot.toLocaleString(args.isKo ? "ko-KR" : "en-US");
        footfallBenchmarkLabel = args.isKo
          ? `일 유동(OTS) ${footFmt}회 — 서울 ${typeLabel} 평균 대비 ${pct} (n=${stats.nFootfall})`
          : `Daily OTS ${footFmt} — vs Seoul ${typeLabel} median: ${pct} (n=${stats.nFootfall})`;
      } else {
        footfallBenchmarkLabel = args.isKo
          ? `서울 ${typeLabel} 유동 벤치마크: ${insufficient}`
          : `Seoul ${typeLabel} footfall benchmark: ${insufficient}`;
      }
    }

    if (!cpmBenchmarkLabel && !footfallBenchmarkLabel) return row;
    return {
      ...row,
      cpmBenchmarkLabel,
      footfallBenchmarkLabel,
    };
  });
}
