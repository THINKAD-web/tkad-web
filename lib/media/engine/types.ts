import type {
  MediaFactSheet,
  MediaExternalSignal,
  ReliabilityGrade,
} from "@prisma/client";

/**
 * 엔진 입력.
 * v0: signals 미사용, legacy/current pass-through
 * v1: signals 필수, legacy는 fallback
 */
export interface EngineMediaFields {
  name: string;
  type: string;
  subCategory: string | null;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
  dailyFootfall: number | null;
  price: number;
  visibilityScore: number;
  impressions: number | null;
  cpm: number | null;
}

export interface EngineInput {
  mediaId: string;
  media: EngineMediaFields;
  fact: MediaFactSheet | null;
  signals: MediaExternalSignal[];
  legacy: {
    dailyImpressions: number | null;
    cpm: number | null;
  };
  /** v0 pass-through: legacy NULL일 때 기존 stored 값 보존 */
  current?: {
    dailyImpressions: number;
    cpm: number;
    contactRate?: number;
  };
}

export type HourlyImpressionPoint = { hour: number; impressions: number };

/**
 * 엔진 출력. DB upsert 전 검증 대상.
 */
export interface EngineOutput {
  dailyImpressions: number;
  /** v1 — 30일 월간 노출 (Media.impressions SSOT) */
  monthlyImpressions?: number;
  hourlyImpressions: HourlyImpressionPoint[] | null;
  cpm: number;
  visibilityScore: number | null;
  reliabilityGrade: ReliabilityGrade;
  sourceSignalIds: string[];
  computedAt: Date;
  contactRate?: number;
  contactRateBasis?: string;
  contactRateInputVisibility?: number | null;
  contactRateInputClass?: string;
  sovShare?: number;
  sovShareBasis?: string;
}

export interface MetricEngine {
  readonly version: string;
  compute(input: EngineInput): EngineOutput;
  canProcess(input: EngineInput): boolean;
}

export interface RecomputeResult {
  mediaId: string;
  engineVersion: string;
  computedAt: Date;
  changed: {
    dailyImpressions: boolean;
    cpm: boolean;
  };
  before: {
    dailyImpressions: number | null;
    cpm: number | null;
    modelVersion: string | null;
  };
  after: {
    dailyImpressions: number;
    cpm: number;
    modelVersion: string;
  };
}
