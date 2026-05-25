"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** 플래너 네온 UI 공통 클래스 */
export const plannerNeon = {
  pageBg: "dark:bg-[#020202] bg-gray-50",
  card: "rounded-2xl border shadow-sm dark:bg-white/5 bg-white dark:border-white/10 border-gray-100",
  cardHeader: "border-b dark:border-white/10 border-gray-100 p-5 sm:p-6",
  label:
    "text-xs font-semibold tracking-widest uppercase dark:text-cyan-400/60 text-cyan-600/60",
  headline: "font-bold dark:text-white text-gray-900",
  subtext: "text-sm dark:text-white/50 text-gray-500",
  kpiCard:
    "rounded-xl border dark:bg-white/5 bg-violet-50 dark:border-white/10 border-violet-100 p-4",
  kpiValue: "text-2xl font-bold tabular-nums dark:text-white text-gray-900",
  kpiLabel: "text-xs dark:text-white/40 text-gray-400",
  cta: "inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-cyan-400 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90",
  ctaSm:
    "inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-500 to-cyan-400 text-white rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90",
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

export function PlannerProGate({
  isPro,
  isKo,
  children,
  className,
  minHeightClass = "min-h-[12rem]",
}: {
  isPro: boolean;
  isKo: boolean;
  children: ReactNode;
  className?: string;
  minHeightClass?: string;
}) {
  return (
    <div className={cn("relative", minHeightClass, className)}>
      <div
        className={cn(
          !isPro && "pointer-events-none select-none blur-sm opacity-60",
        )}
      >
        {children}
      </div>
      {!isPro ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/70 backdrop-blur-sm dark:bg-black/70"
          aria-hidden={false}
        >
          <Lock className="mb-3 h-8 w-8 text-violet-400" aria-hidden />
          <p className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
            {isKo ? "PRO 전용 기능" : "PRO feature"}
          </p>
          <p className="mb-4 px-4 text-center text-sm text-gray-500 dark:text-white/60">
            {isKo
              ? "상세 효과 분석은 PRO 플랜에서 제공됩니다"
              : "Detailed effect analysis is available on PRO"}
          </p>
          <Link
            href="/pricing"
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-2.5 text-sm font-medium text-white"
          >
            {isKo ? "PRO 무료 체험 시작 →" : "Start PRO free trial →"}
          </Link>
          <p className="mt-2 text-xs text-gray-400 dark:text-white/30">
            {isKo ? "지금 가입하면 14일 무료" : "14-day free trial on signup"}
          </p>
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
          {isKo
            ? "✨ 지금 가입하면 상세 효과 시뮬레이션 14일 무료"
            : "✨ Sign up for 14 days of detailed effect simulation free"}
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
