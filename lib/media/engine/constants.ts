/**
 * 계산 엔진 modelVersion SSOT — 하드코딩 금지.
 */
export const MODEL_VERSIONS = {
  LEGACY_MIGRATION_V1: "legacy-migration-v1",
  V0_FALLBACK: "v0-fallback",
} as const;

export type ModelVersion =
  (typeof MODEL_VERSIONS)[keyof typeof MODEL_VERSIONS];

/** 실계산 이전 버전 (레거시 뱃지·재계산 우선 대상) */
export const PRE_COMPUTATION_VERSIONS: ReadonlySet<string> = new Set([
  MODEL_VERSIONS.LEGACY_MIGRATION_V1,
  MODEL_VERSIONS.V0_FALLBACK,
]);

export function isPreComputationVersion(version: string | null | undefined): boolean {
  return version != null && PRE_COMPUTATION_VERSIONS.has(version);
}
