"use client";

import { Link } from "@/i18n/navigation";
import { LayoutList, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { myHubGlassCard } from "@/lib/my-hub-ui";

type Props = {
  isKo: boolean;
  className?: string;
};

export function MyHubEmptyQuickActions({ isKo, className }: Props) {
  const actions = [
    {
      href: "/media",
      icon: Search,
      titleKo: "매체 탐색",
      titleEn: "Browse media",
      descKo: "지역·유형별로 매체 찾기",
      descEn: "Find media by region & type",
    },
    {
      href: "/planner",
      icon: Sparkles,
      titleKo: "AI 플래너",
      titleEn: "AI planner",
      descKo: "예산·목표에 맞게 설계",
      descEn: "Plan by budget & goals",
    },
    {
      href: "/my/plan",
      icon: LayoutList,
      titleKo: "담은 매체",
      titleEn: "Selected media",
      descKo: "카트에 담고 견적 요청",
      descEn: "Build cart & request quote",
    },
  ] as const;

  return (
    <div className={cn("mt-6", className)}>
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {isKo ? "이렇게 시작해 보세요" : "Get started"}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                myHubGlassCard,
                "group flex flex-col gap-2 p-4 transition-colors hover:border-[color:var(--qp-accent)]/30 hover:bg-[color:var(--qp-accent)]/5",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--qp-accent)]/10 text-[color:var(--qp-accent)] transition-colors group-hover:bg-[color:var(--qp-accent)]/15">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-bold text-foreground">
                {isKo ? action.titleKo : action.titleEn}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {isKo ? action.descKo : action.descEn}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
