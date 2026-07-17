"use client";

import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";
import { isPro, type PlanCheckUser } from "@/lib/plan-check-shared";
import { cn } from "@/lib/utils";
import { myHubGlassCard, myHubPrimaryBtn } from "@/lib/my-hub-ui";

type Props = {
  user: PlanCheckUser;
  isKo: boolean;
  className?: string;
};

/** FREE(체험 종료 포함) — PRO 업그레이드 유도 */
export function MyHubUpgradeBanner({ user, isKo, className }: Props) {
  if (isPro(user)) return null;

  return (
    <div
      className={cn(
        myHubGlassCard,
        "border-[color:var(--qp-accent)]/25 bg-gradient-to-br from-[color:var(--qp-accent)]/10 via-transparent to-transparent p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--qp-accent)]/15 text-[color:var(--qp-accent)]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">
              {isKo ? "PRO로 업그레이드" : "Upgrade to PRO"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {isKo
                ? "PDF 리포트·고급 시뮬레이션·플래너 보고서를 이용하세요. 포인트로도 시작할 수 있어요."
                : "Unlock PDF reports, advanced simulation, and planner exports. Start with points or subscribe."}
            </p>
          </div>
        </div>
        <Link href="/pricing" className={cn(myHubPrimaryBtn, "shrink-0")}>
          {isKo ? "PRO 혜택 보기" : "See PRO benefits"}
        </Link>
      </div>
    </div>
  );
}
