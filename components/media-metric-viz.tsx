"use client";

import type { ReactNode } from "react";

/**
 * 매체 카드용 데이터 시각화 컴포넌트 모음 — 홈/매체목록/견적/플래너 어디든 재사용.
 *
 * 1) VisibilityGauge : 0~100 시인성 게이지 바 + 점수 텍스트
 * 2) FootTrafficBadge : 상위 % 뱃지 (percentile prop)
 * 3) ImpressionsCompact : 숫자를 K/M 로 축약 표시
 */

/** 0~100 시인성 게이지 — 60 이하 회색 / 60~80 노랑 / 80~100 초록 */
export function VisibilityGauge({
  score,
  className = "",
  showLabel = true,
}: {
  /** 0~100 */
  score: number;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tier =
    clamped >= 80
      ? { track: "bg-emerald-100", fill: "bg-emerald-500", text: "text-emerald-700", label: "우수" }
      : clamped >= 60
        ? { track: "bg-amber-100", fill: "bg-amber-500", text: "text-amber-700", label: "양호" }
        : { track: "bg-slate-100", fill: "bg-slate-400", text: "text-slate-600", label: "보통" };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between tkad-type-caption font-medium">
          <span className="text-muted-foreground">시인성</span>
          <span className={`font-bold tabular-nums ${tier.text}`}>
            {clamped}
            <span className="ml-0.5 tkad-type-note font-medium opacity-70">/ 100</span>
          </span>
        </div>
      )}
      <div
        className={`h-1.5 w-full overflow-hidden rounded-full ${tier.track}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`시인성 ${clamped}점 (${tier.label})`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${tier.fill}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 유동인구 상위 % 뱃지 — 백분위(1 ~ 100, 작을수록 상위) 를 입력 받아
 * 표시. 전국 매체 대비 순위 계산은 호출부에서 수행.
 */
export function FootTrafficBadge({
  /** daily foot traffic (명) */
  daily,
  /** 전국 상위 백분위 (1 = top 1%). null 이면 % 표시 생략하고 수치만. */
  topPercentile,
  className = "",
}: {
  daily: number | null | undefined;
  topPercentile?: number | null;
  className?: string;
}) {
  if (daily == null || daily <= 0) {
    return (
      <span className={`inline-flex items-center gap-1 tkad-type-caption text-muted-foreground ${className}`}>
        유동 정보 준비 중
      </span>
    );
  }
  const num = new Intl.NumberFormat("ko-KR").format(daily);
  const rank =
    topPercentile != null && topPercentile > 0 && topPercentile <= 100
      ? topPercentile
      : null;

  const pill =
    rank != null && rank <= 10
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : rank != null && rank <= 25
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="tkad-type-caption font-semibold text-navy tabular-nums">
        일 유동 {num}명
      </span>
      {rank != null && (
        <span
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 tkad-type-note font-bold ${pill}`}
          title={`전국 검증 매체 대비 상위 ${rank}% 추정`}
        >
          상위 {rank}%
        </span>
      )}
    </div>
  );
}

/** 큰 수를 K(천) / M(백만) 단위로 축약. 예: 3200000 → "3.2M" */
export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return String(Math.round(n));
}

/** 월 노출 etc. K/M 축약 + 단위 suffix */
export function ImpressionsCompact({
  value,
  suffix = "",
  className = "",
  label = "월 노출",
}: {
  value: number | null | undefined;
  suffix?: string;
  className?: string;
  label?: string;
}) {
  if (value == null || value <= 0) {
    return null;
  }
  return (
    <div
      className={`inline-flex items-baseline gap-1 ${className}`}
      title={`${label} ${value.toLocaleString("ko-KR")}${suffix}`}
    >
      <span className="tkad-type-note font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums text-navy">
        {formatCompactNumber(value)}
        {suffix && <span className="ml-0.5 tkad-type-note font-medium text-muted-foreground">{suffix}</span>}
      </span>
    </div>
  );
}

/** Verified 뱃지 + hover tooltip — 검증 프로세스 설명 */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`group/vb relative inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 tkad-type-note font-bold text-emerald-700 ${className}`}
      title="운영팀이 매체 정보를 확인해 등록한 매체입니다. 지표는 이상값 검사를 거칩니다."
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3 w-3"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L9 10.586l3.293-3.293a1 1 0 011.414 1.414z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}

/** 매체 유형별 뱃지 색상 구분 */
export function MediaTypeBadge({
  type,
  label,
  className = "",
}: {
  type: string;
  label?: ReactNode;
  className?: string;
}) {
  const styleByType: Record<string, string> = {
    digital: "bg-indigo-50 text-indigo-700 border-indigo-200",
    static: "bg-slate-50 text-slate-700 border-slate-200",
    mobile: "bg-rose-50 text-rose-700 border-rose-200",
    network: "bg-amber-50 text-amber-800 border-amber-200",
  };
  const style = styleByType[type] ?? "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 tkad-type-note font-semibold uppercase tracking-wide ${style} ${className}`}
    >
      {label ?? type}
    </span>
  );
}
