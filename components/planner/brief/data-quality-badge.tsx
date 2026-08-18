"use client";

/**
 * 데이터 신뢰도 배지 — [실측] / [추정] / [산정 중].
 *
 * **화면이 임의로 판정하지 않는다.** 값과 함께 올라온 `basis`
 * (`lib/metrics/defaults.ts`)를 읽어서 그대로 렌더한다. 값이 없으면
 * (모집단 미연동 등) [산정 중] 이다.
 *
 *   measured → [실측]  DB 실측값
 *   derived  → [추정]  매체 사양·등록가에서 계산 (직접 측정 아님)
 *   default  → [추정]  유형별 기본 상수로 대체
 *   null     → [산정 중]
 */

import type { MetricBasis } from "@/lib/metrics/defaults";

export type BadgeKind = "measured" | "estimated" | "pending";

export function basisToBadge(basis: MetricBasis | null | undefined): BadgeKind {
  if (basis == null) return "pending";
  if (basis === "measured") return "measured";
  return "estimated";
}

const LABELS: Record<BadgeKind, { ko: string; en: string }> = {
  measured: { ko: "실측", en: "Measured" },
  estimated: { ko: "추정", en: "Estimated" },
  pending: { ko: "산정 중", en: "Pending" },
};

const TONE: Record<BadgeKind, string> = {
  measured:
    "border-emerald-400/50 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
  estimated:
    "border-amber-400/50 bg-amber-400/10 text-amber-700 dark:text-amber-400",
  pending:
    "border-zinc-400/50 bg-zinc-400/10 text-zinc-600 dark:text-zinc-400",
};

const BASIS_DETAIL: Record<MetricBasis, { ko: string; en: string }> = {
  measured: { ko: "DB 실측값", en: "Measured value from DB" },
  derived: {
    ko: "매체 사양·등록 상품가에서 계산한 값입니다.",
    en: "Derived from media specs / registered product price.",
  },
  default: {
    ko: "매체별 데이터가 없어 유형별 기본값으로 대체했습니다. (PR-4 이후 실데이터로 교체)",
    en: "No per-media data — substituted a per-type default.",
  },
};

export function DataQualityBadge({
  basis,
  isKo,
  className = "",
}: {
  /** null = 산정 불가 */
  basis: MetricBasis | null | undefined;
  isKo: boolean;
  className?: string;
}) {
  const kind = basisToBadge(basis);
  const label = LABELS[kind][isKo ? "ko" : "en"];
  const detail =
    basis == null
      ? isKo
        ? "행정동 인구 데이터 연동 후 제공됩니다."
        : "Available after dong-level population data is connected."
      : BASIS_DETAIL[basis][isKo ? "ko" : "en"];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TONE[kind]} ${className}`}
      title={detail}
    >
      {isKo ? `[${label}]` : label}
    </span>
  );
}
