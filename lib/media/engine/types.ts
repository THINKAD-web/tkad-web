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
export interface EngineInput {
  mediaId: string;
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
  };
}

export type HourlyImpressionPoint = { hour: number; impressions: number };

/**
 * 엔진 출력. DB upsert 전 검증 대상.
 */
export interface EngineOutput {
  dailyImpressions: number;
  hourlyImpressions: HourlyImpressionPoint[] | null;
  cpm: number;
  visibilityScore: number | null;
  reliabilityGrade: ReliabilityGrade;
  sourceSignalIds: string[];
  computedAt: Date;
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
