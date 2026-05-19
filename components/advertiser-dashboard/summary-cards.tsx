"use client";

import { CalendarClock, LineChart, Megaphone, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  activeCount: number;
  monthImpressions: number;
  totalSpendWon: number;
  nextEndDate: string | null;
  isKo: boolean;
};

function fmt(n: number, isKo: boolean) {
  return n.toLocaleString(isKo ? "ko-KR" : "en-US");
}

const ACCENT = [
  "text-primary",
  "text-accent",
  "text-[#22d3ee]",
  "text-[#a855f7]",
] as const;

export function AdvertiserSummaryCards({
  activeCount,
  monthImpressions,
  totalSpendWon,
  nextEndDate,
  isKo,
}: Props) {
  const cards = [
    {
      icon: Megaphone,
      label: isKo ? "진행 중" : "Active",
      value: String(activeCount),
      sub: isKo ? "캠페인" : "campaigns",
    },
    {
      icon: LineChart,
      label: isKo ? "이번 달 노출" : "This month",
      value: fmt(monthImpressions, isKo),
      sub: isKo ? "추정" : "est.",
    },
    {
      icon: Wallet,
      label: isKo ? "누적 집행" : "Total spend",
      value: fmt(totalSpendWon, isKo),
      sub: isKo ? "원" : "KRW",
    },
    {
      icon: CalendarClock,
      label: isKo ? "다음 종료" : "Next end",
      value: nextEndDate ?? "—",
      sub: isKo ? "예정일" : "date",
    },
  ];

  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className={cn(
            "tkad-glass-surface tkad-neon-border min-w-[78%] shrink-0 snap-center rounded-[28px] border p-6 backdrop-blur-md",
            "transition-all hover:-translate-y-0.5 hover:border-primary/25",
            "sm:min-w-0",
          )}
        >
          <c.icon className={cn("h-7 w-7", ACCENT[i % ACCENT.length])} aria-hidden />
          <p className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {c.label}
          </p>
          <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-foreground sm:text-[2rem]">
            {c.value}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
