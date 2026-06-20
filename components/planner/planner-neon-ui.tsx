"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { plannerProGateTrialHint, plannerTrialBannerText } from "@/lib/entitlements/gate-ui";
import { cn } from "@/lib/utils";

/** 플래너 네온 UI 공통 클래스 */
export const plannerNeon = {
  pageBg: "dark:bg-[#020202] bg-gray-50",
  card: "rounded-2xl border shadow-sm dark:bg-white/5 bg-white dark:border-white/10 border-gray-100",
  cardHeader: "border-b dark:border-white/10 border-gray-100 p-5 sm:p-6",
  label:
    "text-xs font-semibold tracking-widest uppercase text-cyan-700/80 dark:text-cyan-300/80",
  headline: "font-bold text-foreground",
  subtext: "text-sm text-muted-foreground",
  kpiCard:
    "rounded-xl border dark:bg-white/5 bg-violet-50 dark:border-white/10 border-violet-100 p-4",
  kpiValue: "text-2xl font-bold tabular-nums dark:text-white text-gray-900",
  kpiLabel: "text-xs dark:text-white/40 text-gray-400",
  cta: "inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-cyan-400 text-white tkad-planner-gradient-cta rounded-xl px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90",
  ctaSm:
    "inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-500 to-cyan-400 text-white tkad-planner-gradient-cta rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90",
  selectChip:
    "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation",
  selectChipActive:
    "border-violet-400/60 bg-gradient-to-r from-violet-500/20 to-cyan-400/20 dark:text-white text-gray-900",
  selectChipIdle:
    "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white dark:text-white/80 text-gray-700 hover:border-violet-300/40",
} as const;

export const PLANNER_CHART_COLORS = {
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  pink: "#EC4899",
  indigo: "#6366F1",
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

export function PlannerProTeaserStats({
  isKo,
  totalImpressions,
  reachCorePct,
  roiExpected,
}: {
  isKo: boolean;
  totalImpressions: number;
  reachCorePct: number;
  roiExpected?: number;
}) {
  return (
    <div
      className="mb-4 grid grid-cols-3 gap-2 blur-xl sm:gap-3"
      aria-hidden
    >
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40">
          {isKo ? "총 노출" : "Impressions"}
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-cyan-400 sm:text-xl">
          {totalImpressions.toLocaleString()}
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40">
          {isKo ? "도달률" : "Reach"}
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-violet-400 sm:text-xl">
          {reachCorePct}%
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5 sm:p-4">
        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/40">
          ROI
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-pink-400 sm:text-xl">
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
}: {
  isPro: boolean;
  isKo: boolean;
  children: ReactNode;
  className?: string;
  minHeightClass?: string;
  /** PRO 판정 로딩 중 — 블러·CTA 없이 중립 스켈레톤 */
  loading?: boolean;
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

  return (
    <div className={cn("relative", minHeightClass, className)}>
      <div
        className={cn(
          !isPro && "pointer-events-none select-none blur-md opacity-70",
        )}
      >
        {children}
      </div>
      {!isPro ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/75 p-4 backdrop-blur-sm dark:bg-black/70"
          aria-hidden={false}
        >
          <div className="max-w-sm rounded-2xl border border-gray-200 bg-white px-6 py-5 text-center shadow-lg dark:border-white/10 dark:bg-gray-950/95">
            <p className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
              {isKo
                ? "🔒 결과를 확인하려면 PRO가 필요해요"
                : "🔒 PRO required to view results"}
            </p>
            <p className="mb-1 text-center text-sm text-gray-600 dark:text-white/70">
              {isKo
                ? "노출 예측·시뮬레이션·PDF 보고서 포함"
                : "Includes exposure forecast, simulation & PDF report"}
            </p>
            <p className="mb-4 text-xs text-gray-500 dark:text-white/50">
              {plannerProGateTrialHint(isKo)}
            </p>
            <Link
              href="/pricing"
              className="tkad-neon-cta inline-flex rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-2.5 text-sm font-medium text-white"
            >
              {isKo ? "PRO 무료 체험 시작 →" : "Start PRO free trial →"}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PlannerTrialBanner({ isKo }: { isKo: boolean }) {
  return (
    <div
      className={cn(
        "mb-4 rounded-xl border p-3 sm:p-4",
        "dark:border-violet-500/30 border-violet-200",
        "dark:bg-violet-500/10 bg-violet-50",
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
