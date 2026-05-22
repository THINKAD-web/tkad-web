import { MEDIA_OWNER_FEE_RATE } from "@/lib/media-owner-constants";

/** 카탈로그·집행 통계 기반 추정치 (가동률 70%) */
export const MEDIA_OWNER_UTILIZATION_RATE = 0.7;

export const REVENUE_CALC_REGIONS = [
  { value: "seoul_gangnam", ko: "서울 강남·테헤란", en: "Seoul Gangnam" },
  { value: "seoul_hongdae", ko: "서울 홍대·마포", en: "Seoul Hongdae" },
  { value: "seoul", ko: "서울 기타", en: "Seoul (other)" },
  { value: "busan", ko: "부산", en: "Busan" },
  { value: "daegu", ko: "대구", en: "Daegu" },
  { value: "jeju", ko: "제주", en: "Jeju" },
  { value: "national", ko: "전국·고속도로", en: "Nationwide" },
] as const;

export type RevenueCalcRegion = (typeof REVENUE_CALC_REGIONS)[number]["value"];

export const REVENUE_CALC_MEDIA_TYPES = [
  { value: "digital", ko: "디지털 전광판", en: "Digital billboard" },
  { value: "subway", ko: "지하철", en: "Subway" },
  { value: "bus", ko: "버스·쉘터", en: "Bus shelter" },
  { value: "static", ko: "옥외 정형", en: "Static OOH" },
  { value: "network", ko: "네트워크", en: "Network" },
] as const;

export type RevenueCalcMediaType =
  (typeof REVENUE_CALC_MEDIA_TYPES)[number]["value"];

type RegionBenchmark = {
  avgMonthlyPriceWon: number;
  baseMonthlyExecutions: number;
};

type TypeModifier = {
  priceFactor: number;
  executionFactor: number;
};

/** 지역별 THINKAD 카탈로그·문의 데이터 기반 추정 (2025–2026) */
const REGION_BENCHMARKS: Record<RevenueCalcRegion, RegionBenchmark> = {
  seoul_gangnam: { avgMonthlyPriceWon: 8_500_000, baseMonthlyExecutions: 2.1 },
  seoul_hongdae: { avgMonthlyPriceWon: 5_800_000, baseMonthlyExecutions: 1.9 },
  seoul: { avgMonthlyPriceWon: 4_600_000, baseMonthlyExecutions: 1.6 },
  busan: { avgMonthlyPriceWon: 3_400_000, baseMonthlyExecutions: 1.3 },
  daegu: { avgMonthlyPriceWon: 2_500_000, baseMonthlyExecutions: 1.0 },
  jeju: { avgMonthlyPriceWon: 2_900_000, baseMonthlyExecutions: 0.95 },
  national: { avgMonthlyPriceWon: 3_600_000, baseMonthlyExecutions: 1.15 },
};

const TYPE_MODIFIERS: Record<RevenueCalcMediaType, TypeModifier> = {
  digital: { priceFactor: 1.15, executionFactor: 1.05 },
  subway: { priceFactor: 0.85, executionFactor: 1.35 },
  bus: { priceFactor: 0.55, executionFactor: 1.2 },
  static: { priceFactor: 0.95, executionFactor: 0.88 },
  network: { priceFactor: 1.05, executionFactor: 1.25 },
};

export type RevenueEstimateInput = {
  region: RevenueCalcRegion;
  mediaType: RevenueCalcMediaType;
  monthlyPriceWon: number;
};

export type RevenueEstimateResult = {
  annualGrossWon: number;
  annualNetWon: number;
  feeWon: number;
  feeRatePercent: number;
  monthlyExecutions: number;
  utilizationRate: number;
  benchmarkAvgPriceWon: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function defaultMonthlyPriceWon(
  region: RevenueCalcRegion,
  mediaType: RevenueCalcMediaType,
): number {
  const base = REGION_BENCHMARKS[region].avgMonthlyPriceWon;
  const mod = TYPE_MODIFIERS[mediaType].priceFactor;
  return Math.round(base * mod / 100_000) * 100_000;
}

export function estimateMediaOwnerRevenue(
  input: RevenueEstimateInput,
): RevenueEstimateResult {
  const region = REGION_BENCHMARKS[input.region];
  const typeMod = TYPE_MODIFIERS[input.mediaType];
  const benchmarkAvgPriceWon = Math.round(
    region.avgMonthlyPriceWon * typeMod.priceFactor,
  );

  const priceRatio =
    benchmarkAvgPriceWon > 0
      ? input.monthlyPriceWon / benchmarkAvgPriceWon
      : 1;
  const priceDemandAdjust = clamp(1.35 - priceRatio * 0.35, 0.55, 1.35);

  const monthlyExecutions =
    Math.round(
      region.baseMonthlyExecutions *
        typeMod.executionFactor *
        priceDemandAdjust *
        10,
    ) / 10;

  const executionDemandFactor = clamp(
    monthlyExecutions / (region.baseMonthlyExecutions * typeMod.executionFactor),
    0.55,
    1.35,
  );

  const annualGrossWon = Math.round(
    input.monthlyPriceWon *
      12 *
      MEDIA_OWNER_UTILIZATION_RATE *
      executionDemandFactor,
  );

  const feeWon = Math.round(annualGrossWon * MEDIA_OWNER_FEE_RATE);
  const annualNetWon = annualGrossWon - feeWon;

  return {
    annualGrossWon,
    annualNetWon,
    feeWon,
    feeRatePercent: Math.round(MEDIA_OWNER_FEE_RATE * 100),
    monthlyExecutions,
    utilizationRate: MEDIA_OWNER_UTILIZATION_RATE,
    benchmarkAvgPriceWon,
  };
}

export function formatRevenueManWon(won: number, isKo: boolean): string {
  const man = Math.round(won / 10_000);
  if (isKo) {
    if (man >= 10_000) {
      const eok = Math.floor(man / 10_000);
      const rest = man % 10_000;
      return rest > 0 ? `${eok}억 ${rest.toLocaleString("ko-KR")}만원` : `${eok}억원`;
    }
    return `${man.toLocaleString("ko-KR")}만원`;
  }
  if (won >= 100_000_000) {
    return `₩${(won / 100_000_000).toFixed(1)}B`;
  }
  return `₩${Math.round(won / 1_000_000).toLocaleString("en-US")}M`;
}

export const REVENUE_PRICE_SLIDER = {
  min: 500_000,
  max: 30_000_000,
  step: 500_000,
} as const;
