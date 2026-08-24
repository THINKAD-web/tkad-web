"use client";

import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";
import { MyPlanStatusBadge } from "@/components/my/my-plan-status-badge";
import { resolvePlanDisplayInfo } from "@/lib/subscription-plan-display";
import type { PlanCheckUser } from "@/lib/plan-check-shared";
import { cn } from "@/lib/utils";

type Props = {
  user: PlanCheckUser & { trialDaysLeft?: number; trialEndsAt?: string | Date | null };
  subscriptionEndDate?: string | null;
  subscriptionPlan?: string | null;
  isKo: boolean;
  className?: string;
};

export function MySubscriptionCard({
  user,
  subscriptionEndDate,
  subscriptionPlan,
  isKo,
  className,
}: Props) {
  const info = resolvePlanDisplayInfo(
    user,
    {
      plan: user.plan ?? "FREE",
      trialEndsAt: user.trialEndsAt ? String(user.trialEndsAt) : null,
      subscriptionEndDate: subscriptionEndDate ?? null,
      subscriptionPlan: subscriptionPlan ?? null,
    },
    isKo,
  );

  return (
    <section
      className={cn(
        "tkad-qp-pricing-card rounded-[var(--qp-radius-lg)] border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5",
        className,
      )}
      aria-labelledby="my-subscription-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            id="my-subscription-heading"
            className="font-display text-[10px] font-medium uppercase tracking-[0.2em] tkad-qp-text-muted"
          >
            {isKo ? "현재 플랜" : "Current plan"}
          </p>
          <div className="mt-2">
            <MyPlanStatusBadge user={user} isKo={isKo} />
          </div>
          <p className="mt-2 text-sm font-semibold tkad-qp-text-primary">
            {info.planLabel}
          </p>
          {info.expiryLabel ? (
            <p className="mt-1 text-xs tkad-qp-text-muted">{info.expiryLabel}</p>
          ) : null}
        </div>
        <Link
          href={info.upgradeHref}
          className="tkad-qp-cta inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[var(--qp-radius-md)] px-4 text-xs font-bold text-white"
        >
          {isKo ? info.upgradeLabelKo : info.upgradeLabelEn}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
