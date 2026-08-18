"use client";

/**
 * O-1 디지털 배분 출처 배지 — OOH 지표용 DataQualityBadge 와 분리.
 *
 *   live      → [실측]       BFF POST /api/integrated/mix 응답
 *   benchmark → [벤치마크 기반]  로컬 recommendDigitalChannels 폴백 (503 등)
 */

export type DigitalAllocationSource = "live" | "benchmark";

const LABELS: Record<DigitalAllocationSource, { ko: string; en: string }> = {
  live: { ko: "실측", en: "Live" },
  benchmark: { ko: "벤치마크 기반", en: "Benchmark-based" },
};

const TONE: Record<DigitalAllocationSource, string> = {
  live: "border-emerald-400/50 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
  benchmark:
    "border-sky-400/50 bg-sky-400/10 text-sky-800 dark:text-sky-300",
};

const DETAIL: Record<DigitalAllocationSource, { ko: string; en: string }> = {
  live: {
    ko: "디지털 API(BFF) 응답으로 산출된 배분입니다.",
    en: "Allocation from the digital API (BFF) response.",
  },
  benchmark: {
    ko: "디지털 API를 사용할 수 없어 로컬 채널 벤치마크로 배분했습니다.",
    en: "Digital API unavailable — allocation uses local channel benchmarks.",
  },
};

export function AllocationSourceBadge({
  source,
  isKo,
  className = "",
}: {
  source: DigitalAllocationSource;
  isKo: boolean;
  className?: string;
}) {
  const label = LABELS[source][isKo ? "ko" : "en"];
  const detail = DETAIL[source][isKo ? "ko" : "en"];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TONE[source]} ${className}`}
      title={detail}
      data-allocation-source={source}
    >
      {isKo ? `[${label}]` : label}
    </span>
  );
}
