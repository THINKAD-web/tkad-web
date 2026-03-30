"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SimpleFilterKey = "bus" | "subway" | "screen" | "building";

type Props = {
  selected: ReadonlySet<SimpleFilterKey>;
  onToggle: (k: SimpleFilterKey) => void;
  onReset: () => void;
  isKo: boolean;
  resetLabel: string;
  variant?: "inline" | "bar";
};

export function MediaFilterButtons({
  selected,
  onToggle,
  onReset,
  isKo,
  resetLabel,
  variant = "inline",
}: Props) {
  const chips: { key: SimpleFilterKey; emoji: string; labelKo: string; labelEn: string }[] =
    [
      { key: "bus", emoji: "🚌", labelKo: "버스정류장", labelEn: "Bus stop" },
      { key: "subway", emoji: "🚇", labelKo: "지하철", labelEn: "Subway" },
      {
        key: "screen",
        emoji: "📺",
        labelKo: "전광판/빌보드",
        labelEn: "Screen / billboard",
      },
      { key: "building", emoji: "🏢", labelKo: "건물외벽", labelEn: "Building wall" },
    ];

  const row = (
    <>
      {chips.map(({ key, emoji, labelKo, labelEn }) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          className={cn(
            "touch-manipulation rounded-full border px-4 py-2 text-sm font-bold transition",
            variant === "bar" && "shrink-0 whitespace-nowrap",
            selected.has(key)
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-navy/15 bg-white text-navy hover:bg-slate-50",
          )}
        >
          {emoji} {isKo ? labelKo : labelEn}
        </button>
      ))}
      <Button
        type="button"
        variant="outline"
        className={cn(
          "rounded-full border-navy/15",
          variant === "bar" && "shrink-0",
        )}
        onClick={onReset}
      >
        {resetLabel}
      </Button>
    </>
  );

  if (variant === "bar") {
    return (
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-3 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {row}
      </div>
    );
  }

  return <div className="flex flex-wrap items-center gap-2">{row}</div>;
}
