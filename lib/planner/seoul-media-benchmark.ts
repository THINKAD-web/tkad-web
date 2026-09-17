import type { MediaItem } from "@/lib/media-data";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { classifyMedia } from "@/lib/metrics/classify";
import { isCpmInRange } from "@/lib/metrics/cpm";
import {
  DAYS_PER_MONTH,
  MIN_IMPRESSIONS_FOR_CPM,
} from "@/lib/metrics/constants";
import {
  resolveContactRateWithBasis,
  resolveSovShareWithBasis,
} from "@/lib/metrics/defaults";
import { calcImpressions } from "@/lib/metrics/impressions";
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

/** v1ImpressionsEngine 과 동일 — 월 1유닛 기준 카탈로그 CPM */
export function catalogMonthlyReferenceCpm(m: MediaItem): {
  cpm: number;
  mediaClass: MediaMetricClass;
} | null {
  const daily = m.dailyFootTraffic ?? 0;
  if (daily <= 0) return null;
  const mediaClass = classifyMedia({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaMainCategory,
    name: m.name,
    widthM: m.widthM,
    heightM: m.heightM,
  });
  const contact = resolveContactRateWithBasis({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaMainCategory,
    name: m.name,
  });
  const sov = resolveSovShareWithBasis({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaMainCategory,
    name: m.name,
  });
  const { totalImpressions } = calcImpressions({
    dailyTraffic: daily,
    contactRate: contact.value,
    sovShare: sov.value,
    units: 1,
    days: DAYS_PER_MONTH,
  });
  const priceWon = catalogPriceFieldToWon(m.price);
  if (priceWon <= 0 || totalImpressions < MIN_IMPRESSIONS_FOR_CPM) return null;
  const cpm = Math.round((priceWon / totalImpressions) * 1000);
  if (cpm <= 0) return null;
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
    if (ref && isCpmInRange(ref.cpm, ref.mediaClass)) {
      buckets[bucket].cpms.push(ref.cpm);
    }
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
    const insufficient = args.isKo
      ? SEOUL_BENCHMARK_INSUFFICIENT_KO
      : SEOUL_BENCHMARK_INSUFFICIENT_EN;

    let cpmBenchmarkLabel: string | undefined;
    const lineCpm = cpmById.get(row.id);
    if (lineCpm != null && lineCpm > 0) {
      if (stats.cpmComparable && stats.medianCpm != null) {
        const pct = formatPctLine(
          pctVsMedian(lineCpm, stats.medianCpm),
          args.isKo,
        );
        const cpmFmt = lineCpm.toLocaleString(args.isKo ? "ko-KR" : "en-US");
        const medFmt = stats.medianCpm.toLocaleString(
          args.isKo ? "ko-KR" : "en-US",
        );
        cpmBenchmarkLabel = args.isKo
          ? `이 매체 CPM ₩${cpmFmt} — 서울 ${typeLabel} 평균(중앙값) ₩${medFmt} 대비 ${pct} (n=${stats.nCpm})`
          : `CPM ₩${cpmFmt} — vs Seoul ${typeLabel} median ₩${medFmt}: ${pct} (n=${stats.nCpm})`;
      } else {
        cpmBenchmarkLabel = args.isKo
          ? `서울 ${typeLabel} CPM 벤치마크: ${insufficient}`
          : `Seoul ${typeLabel} CPM benchmark: ${insufficient}`;
      }
    }

    let footfallBenchmarkLabel: string | undefined;
    const foot = row.dailyTraffic ?? media.dailyFootTraffic ?? 0;
    if (foot > 0) {
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
