"use client";

import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { isPro, type PlanCheckUser } from "@/lib/plan-check-shared";
import { cn } from "@/lib/utils";

type Props = {
  user: PlanCheckUser & { trialDaysLeft?: number };
  isKo: boolean;
  className?: string;
  showPoints?: number;
};

export function MyPlanStatusBadge({
  user,
  isKo,
  className,
  showPoints,
}: Props) {
  const pro = isPro(user);
  const days = user.trialDaysLeft ?? 0;
  const plan = user.plan ?? "FREE";

  let label: string;
  let tone: "free" | "trial" | "pro";

  if (pro && plan === "PRO_TRIAL" && days > 0) {
    label = isKo ? `PRO 체험 D-${days}` : `PRO trial · ${days}d left`;
    tone = "trial";
  } else if (pro && (plan === "PRO" || plan === "ENTERPRISE")) {
    label = plan === "ENTERPRISE" ? "ENTERPRISE" : "PRO";
    tone = "pro";
  } else {
    label = isKo ? "FREE" : "FREE";
    tone = "free";
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
          tone === "pro" &&
            "tkad-qp-cta text-white shadow-sm",
          tone === "trial" &&
            "tkad-qp-cta text-white shadow-sm",
          tone === "free" &&
            "border border-gray-300 bg-gray-100 text-gray-700 dark:border-white/15 dark:bg-white/10 dark:text-white/80",
        )}
      >
        {tone !== "free" ? (
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
        ) : null}
        {label}
      </span>
      {typeof showPoints === "number" ? (
        <Link
          href="/points"
          className="inline-flex items-center gap-1 rounded-full border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent)]/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[color:var(--qp-accent)] transition hover:bg-[color:var(--qp-accent)]/15"
        >
          {showPoints.toLocaleString(isKo ? "ko-KR" : "en-US")}P
        </Link>
      ) : null}
    </div>
  );
}
