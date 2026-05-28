"use client";

import { Plus } from "lucide-react";
import { useAppToast } from "@/lib/use-toast";
import { usePlanCart } from "@/hooks/use-plan-cart";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import { cn } from "@/lib/utils";

type Props = {
  item: Omit<PlanCartItem, "addedAt">;
  addedFrom?: PlanCartAddedFrom;
  compact?: boolean;
  /** 그리드 카드 — 짧은 라벨 (플랜+ / 플랜✓) */
  gridInline?: boolean;
  className?: string;
};

export function PlanCartAddButton({
  item,
  addedFrom,
  compact = false,
  gridInline = false,
  className,
}: Props) {
  const toast = useAppToast();
  const { has, add } = usePlanCart();
  const inPlan = has(item.mediaId);
  const payload = { ...item, addedFrom: addedFrom ?? item.addedFrom };

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const result = add(payload);
    if (result.ok && result.added) {
      toast.success(`${item.mediaName}이(가) 플랜에 추가됐어요 ✓`);
      return;
    }
    if (result.ok && !result.added) {
      toast.warning("이미 플랜에 있습니다");
      return;
    }
    toast.error("플랜은 최대 10개 매체까지 가능합니다");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-xl border font-semibold transition active:scale-95",
        compact ? "h-9 px-2.5 text-xs" : "h-10 px-3 text-xs",
        inPlan
          ? "border-violet-500/40 bg-violet-500 text-white shadow-sm shadow-violet-500/25"
          : "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/12 dark:bg-white/10 dark:text-white/90",
        className,
      )}
      aria-pressed={inPlan}
      aria-label={inPlan ? "플랜에 담김" : "플랜에 담기"}
    >
      {gridInline ? (
        inPlan ? (
          <>플랜✓</>
        ) : (
          <>플랜+</>
        )
      ) : inPlan ? (
        <>담김 ✓</>
      ) : (
        <>
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          플랜 담기
        </>
      )}
    </button>
  );
}
