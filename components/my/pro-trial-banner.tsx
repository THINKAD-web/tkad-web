"use client";

import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { myHubGlassCard, myHubPrimaryBtn } from "@/lib/my-hub-ui";

export type ProTrialStatus = {
  plan: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  daysLeft: number;
  progressPct: number;
};

type Props = {
  trial: ProTrialStatus;
  isKo: boolean;
};

export function ProTrialBanner({ trial, isKo }: Props) {
  if (trial.plan !== "PRO_TRIAL" || trial.daysLeft <= 0) return null;

  return (
    <div
      className={cn(
        myHubGlassCard,
        "relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/5 p-5 sm:p-6",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
              {isKo
                ? `PRO 체험 중 — D-${trial.daysLeft} 남음`
                : `PRO trial — ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} left`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {isKo
                ? "PDF 리포트·고급 분석·시장 대시보드를 무료로 이용 중입니다."
                : "PDF reports, advanced analytics, and market dashboard included."}
            </p>
          </div>
        </div>
        <Link href="/pricing" className={cn(myHubPrimaryBtn, "shrink-0")}>
          {isKo ? "지금 구독하기" : "Subscribe now"}
        </Link>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{isKo ? "체험 진행" : "Trial progress"}</span>
          <span>{trial.progressPct}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted/60"
          role="progressbar"
          aria-valuenow={trial.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={isKo ? "PRO 체험 진행률" : "PRO trial progress"}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${trial.progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
