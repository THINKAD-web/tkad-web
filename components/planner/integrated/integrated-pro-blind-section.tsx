"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = {
  isPro: boolean;
  isKo: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function IntegratedProBlindSection({
  isPro,
  isKo,
  title,
  description,
  children,
  className,
}: Props) {
  const heading = title ?? (isKo ? "PRO 전용 분석" : "PRO-only analysis");
  const body =
    description ??
    (isKo
      ? "시너지 효과·통합 CPM·ROI 예측은 PRO 플랜에서 확인 가능합니다"
      : "Synergy, blended CPM & ROI forecasts are available on PRO");

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <div
        className={cn(
          !isPro && "pointer-events-none select-none blur-md",
        )}
      >
        {children}
      </div>

      {!isPro ? (
        <div
          className="tkad-planner-dark-surface absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-black/60 to-black/90 p-6"
          aria-hidden={false}
        >
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent)]/20">
              <Lock className="h-6 w-6 text-[color:var(--qp-accent)]" aria-hidden />
            </div>
            <p className="mb-1 text-base font-bold text-white">{heading}</p>
            <p className="mb-4 text-sm leading-relaxed text-white/60">{body}</p>
            <Link
              href="/pricing"
              className="tkad-qp-cta inline-flex items-center gap-2 rounded-[var(--qp-radius-md)] bg-[color:var(--qp-accent)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              {isKo ? "PRO 14일 무료 체험 →" : "Start 14-day PRO trial →"}
            </Link>
            <p className="mt-2 text-xs text-white/30">
              {isKo
                ? "지금 가입하면 즉시 전체 보고서 확인"
                : "Sign up to unlock the full report"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
