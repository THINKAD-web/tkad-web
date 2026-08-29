/**
 * 신뢰도 배지 문구 — **화면·패널 공용 SSOT**.
 *
 * 전에는 같은 "산정 중" 상태를 세 곳이 서로 다르게 설명했다:
 *   - 배지 툴팁      "행정동 인구 데이터 연동 후 제공됩니다"
 *   - 지표 패널 안내  "커버리지·인구 데이터가 있는 매체가 없습니다"
 *   - 실제 동작       `lib/metrics/coverage-map.ts` 는 **시·군·구** 단위
 *
 * 셋 다 같은 상태를 가리키는데 단위(행정동/구)도 다르고 시점 약속도 달랐다.
 * 여기 한 곳만 고치면 전부 따라오도록 모았다.
 *
 * 시점을 약속하지 않는다 — "언제 연동된다"는 문구는 일정이 확정된 뒤에만
 * 쓸 것. 지키지 못할 약속이 화면에 남는다.
 *
 * `lib/` 에 두는 이유는 `basis-to-badge.ts` 와 같다 — 서버(리포트 PDF 빌드)도
 * 읽으므로 "use client" 를 붙이면 안 된다.
 */

import type { MetricBasis } from "@/lib/metrics/defaults";
import type { BadgeKind } from "@/lib/planner/brief/basis-to-badge";

export const DATA_QUALITY_LABELS: Record<BadgeKind, { ko: string; en: string }> =
  {
    measured: { ko: "실측", en: "Measured" },
    estimated: { ko: "추정", en: "Estimated" },
    pending: { ko: "산정 중", en: "Pending" },
  };

export const DATA_QUALITY_BASIS_DETAIL: Record<
  MetricBasis,
  { ko: string; en: string }
> = {
  measured: {
    ko: "매체별로 측정된 값이 데이터베이스에 있습니다.",
    en: "A measured per-media value exists in the database.",
  },
  derived: {
    ko: "매체 사양·등록 상품가에서 계산한 값입니다.",
    en: "Derived from media specs / registered product price.",
  },
  parsed: {
    ko: "등록된 targetAge 텍스트를 파싱한 연령 추정치입니다.",
    en: "Age estimate parsed from registered targetAge text.",
  },
  default: {
    ko: "매체별 데이터가 없어 같은 유형의 기본값으로 대체했습니다.",
    en: "No per-media data — substituted a per-type default.",
  },
  override: {
    ko: "운영팀이 loop SOV로 수동 지정한 매체입니다.",
    en: "Loop SOV manually specified by ops.",
  },
};

/** basis 가 null 일 때 — 근거가 없어 값을 만들지 않은 상태 */
export const DATA_QUALITY_PENDING_DETAIL = {
  ko: "커버리지 인구 데이터가 없어 아직 산정하지 못한 값입니다. 근거가 없을 때는 추정치를 만들지 않고 비워 둡니다.",
  en: "Not yet calculated — no coverage population data. We leave it blank rather than inventing an estimate.",
} as const;

/** 믹스 전체에 커버리지 매체가 하나도 없을 때 (지표 패널 행 아래 안내) */
export const DATA_QUALITY_PENDING_HINT = {
  ko: "커버리지 인구 데이터가 있는 매체가 없습니다",
  en: "No media with coverage population data in this mix",
} as const;

/** 일부 매체만 제외됐을 때 */
export function dataQualityExcludedNote(count: number, isKo: boolean): string {
  return isKo
    ? `${count}개 매체는 커버리지 인구 데이터가 없어 도달 계산에서 제외되었습니다.`
    : `${count} media excluded from reach — no coverage population data.`;
}

export function dataQualityDetail(
  basis: MetricBasis | null | undefined,
  isKo: boolean,
): string {
  const copy =
    basis == null ? DATA_QUALITY_PENDING_DETAIL : DATA_QUALITY_BASIS_DETAIL[basis];
  return isKo ? copy.ko : copy.en;
}
