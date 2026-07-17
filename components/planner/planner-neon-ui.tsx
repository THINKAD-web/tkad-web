"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";
import { buildFeatureGateMessage } from "@/lib/entitlements/gate-messages";
import { TierGatePanel } from "@/components/entitlements/tier-gate-panel";
import { plannerProGateTrialHint, plannerTrialBannerText } from "@/lib/entitlements/gate-ui";
import { cn } from "@/lib/utils";

/** 플래너 Quiet Professional UI 공통 클래스 (legacy export name 유지) */
export const plannerNeon = {
  pageBg: "dark:bg-[#020202] bg-gray-50",
  card: "rounded-[var(--qp-radius-lg)] border shadow-sm dark:bg-white/5 bg-white dark:border-white/10 border-[color:var(--qp-line)]",
  cardHeader: "border-b dark:border-white/10 border-[color:var(--qp-line)] p-5 sm:p-6",
  label:
    "text-xs font-semibold tracking-widest uppercase text-[color:var(--qp-fg-muted)]",
  headline: "font-bold text-foreground",
  subtext: "text-sm text-muted-foreground",
  kpiCard:
    "rounded-[var(--qp-radius-md)] border dark:bg-white/5 bg-[color:var(--qp-accent-soft)] dark:border-white/10 border-[color:var(--qp-line)] p-4",
  kpiValue: "text-2xl font-bold tabular-nums dark:text-white text-gray-900",
  kpiLabel: "text-xs dark:text-white/40 text-gray-400",
  cta: "inline-flex items-center justify-center gap-2 bg-[color:var(--qp-accent)] text-white rounded-[var(--qp-radius-md)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[color:var(--qp-accent-hover)]",
  ctaSm:
    "inline-flex items-center justify-center gap-1.5 bg-[color:var(--qp-accent)] text-white rounded-[var(--qp-radius-md)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[color:var(--qp-accent-hover)]",
  selectChip:
    "rounded-[var(--qp-radius-md)] border px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation",
  selectChipActive:
    "border-[color:var(--qp-accent)]/60 bg-[color:var(--qp-accent-soft)] dark:bg-[color:var(--qp-accent)]/20 dark:text-white text-gray-900",
  selectChipIdle:
    "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white dark:text-white/80 text-gray-700 hover:border-[color:var(--qp-accent)]/35",
} as const;

export const PLANNER_CHART_COLORS = {
  violet: "#ff6200",
  cyan: "#1c1c1f",
  pink: "#5a5a5e",
  indigo: "#08080a",
} as const;

export function PlannerNeonLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn(plannerNeon.label, className)}>{children}</p>;
}

export function PlannerNeonCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(plannerNeon.card, className)}>{children}</div>;
}

/** 비PRO 잠금 — 실데이터 없는 블러 스켈레톤 + 자물쇠 (무거운 children 미마운트) */
export function PlannerProLockedSkeleton({
  isKo,
  className,
  minHeightClass = "min-h-[11rem]",
}: {
  isKo: boolean;
  className?: string;
  minHeightClass?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border dark:border-white/10 border-gray-200",
        "dark:bg-white/[0.03] bg-gray-50/80",
        minHeightClass,
        className,
      )}
      aria-hidden
    >
      <div className="pointer-events-none select-none p-5 opacity-55 blur-[2px] sm:p-6 dark:opacity-60">
        <div className="space-y-3">
          <div className="h-2.5 w-24 rounded-full bg-gray-300 dark:bg-white/25" />
          <div className="h-6 w-3/5 max-w-xs rounded-lg bg-gray-300/90 dark:bg-white/20" />
          <div className="h-3 w-2/5 max-w-[10rem] rounded-full bg-gray-200 dark:bg-white/15" />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-gray-200/80 bg-gray-200/90 dark:border-white/10 dark:bg-white/10 sm:h-16"
            />
          ))}
        </div>
        <div className="mt-4 h-28 rounded-xl border border-gray-200/70 bg-gray-100 dark:border-white/8 dark:bg-white/[0.06] sm:h-32" />
        <div className="mt-4 space-y-2">
          {[100, 88, 76, 64].map((w) => (
            <div
              key={w}
              className="h-2.5 rounded-full bg-gray-200 dark:bg-white/12"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-background/5 via-background/15 to-background/25">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-background/90 px-4 py-3 shadow-sm dark:border-white/15 dark:bg-[#1a1a1a]/80">
          <Lock className="h-5 w-5 text-[color:var(--qp-accent)]" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">
            {isKo ? "잠긴 프리미엄 콘텐츠" : "Locked premium content"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 잠금 스켈레톤 + 선택적 KPI·안내 문구 */
export function PlannerProLockedPlaceholder({
  isKo,
  children,
  className,
  skeletonClassName,
}: {
  isKo: boolean;
  children?: ReactNode;
  className?: string;
  skeletonClassName?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <PlannerProLockedSkeleton isKo={isKo} className={skeletonClassName} />
      {children}
    </div>
  );
}

export function PlannerProTeaserStats({
  isKo,
  totalImpressions,
  reachCorePct,
  roiExpected,
  blurred = true,
}: {
  isKo: boolean;
  totalImpressions: number;
  reachCorePct: number;
  roiExpected?: number;
  /** 잠금 placeholder용 — 블러 없이 요약만 표시 */
  blurred?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-4 grid grid-cols-3 gap-2 sm:gap-3",
        blurred && "pointer-events-none select-none blur-xl",
      )}
      aria-hidden={blurred}
    >
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40">
          {isKo ? "총 노출" : "Impressions"}
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-[color:var(--qp-accent)] sm:text-xl">
          {totalImpressions.toLocaleString()}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40">
          {isKo ? "도달률" : "Reach"}
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-[color:var(--qp-fg)] sm:text-xl">
          {reachCorePct}%
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40">
          ROI
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-[color:var(--qp-fg-muted)] sm:text-xl">
          {roiExpected ?? "—"}
          {roiExpected != null ? "x" : ""}
        </p>
      </div>
    </div>
  );
}

export function PlannerProGate({
  isPro,
  isKo,
  children,
  className,
  minHeightClass = "min-h-[12rem]",
  loading = false,
  access,
  feature = "planner_result",
  lockedPlaceholder,
}: {
  isPro: boolean;
  isKo: boolean;
  children: ReactNode;
  className?: string;
  minHeightClass?: string;
  /** PRO 판정 로딩 중 — 블러·CTA 없이 중립 스켈레톤 */
  loading?: boolean;
  /** entitlements access — 맥락 안내용 (useFeatureAccess.access) */
  access?: AccessCheckResult;
  feature?: ReportFeature;
  /** 비PRO — 무거운 children 대신 경량 요약·잠금 안내만 표시 (children 미마운트) */
  lockedPlaceholder?: ReactNode;
}) {
  if (loading) {
    return (
      <div
        className={cn("relative", minHeightClass, className)}
        aria-busy="true"
        aria-label={isKo ? "접근 권한 확인 중" : "Checking access"}
      >
        <div className="h-full min-h-[inherit] animate-pulse rounded-2xl border dark:border-white/8 border-gray-100 dark:bg-white/5 bg-gray-100/80" />
      </div>
    );
  }

  if (isPro) {
    return (
      <div className={cn("relative", minHeightClass, className)}>{children}</div>
    );
  }

  const gateAccess: AccessCheckResult =
    access ??
    ({
      allowed: false,
      level: "MEMBER",
      reason: "upgrade",
    } satisfies AccessCheckResult);

  const message = buildFeatureGateMessage({ feature, access: gateAccess, isKo });

  return (
    <div className={cn("relative space-y-4", minHeightClass, className)}>
      {lockedPlaceholder ?? <PlannerProLockedSkeleton isKo={isKo} />}
      <TierGatePanel message={message} className="mx-auto" />
    </div>
  );
}

export function PlannerTrialBanner({ isKo }: { isKo: boolean }) {
  return (
    <div
      className={cn(
        "mb-4 rounded-[var(--qp-radius-md)] border p-3 sm:p-4",
        "border-[color:var(--qp-accent)]/30 dark:border-[color:var(--qp-accent)]/35",
        "bg-[color:var(--qp-accent-soft)] dark:bg-[color:var(--qp-accent)]/10",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium dark:text-white/90 text-gray-800">
          {plannerTrialBannerText(isKo)}
        </p>
        <Link href="/pricing" className={cn(plannerNeon.ctaSm, "shrink-0")}>
          {isKo ? "무료 체험 시작하기 →" : "Start free trial →"}
        </Link>
      </div>
    </div>
  );
}

export function PlannerNeonButton({
  children,
  onClick,
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        plannerNeon.cta,
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PlannerPdfLockLabel({ isKo, locked }: { isKo: boolean; locked: boolean }) {
  if (!locked) return null;
  return (
    <Lock className="inline h-3.5 w-3.5 opacity-80" aria-hidden />
  );
}
