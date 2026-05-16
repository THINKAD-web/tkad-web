"use client";

import { CalendarClock, LineChart, Megaphone, Wallet } from "lucide-react";

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
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="min-w-[72%] shrink-0 snap-center rounded-[20px] border border-border bg-card p-4 shadow-sm sm:min-w-0"
        >
          <c.icon className="h-5 w-5 text-primary" aria-hidden />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums tracking-tight">
            {c.value}
          </p>
          <p className="text-xs text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
