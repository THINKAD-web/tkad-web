"use client";

import { Check, Plus } from "lucide-react";
import { useLocale } from "next-intl";
import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { useAppToast } from "@/lib/use-toast";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { useIsPro } from "@/hooks/use-is-pro";
import { buildPlanCartLimitMessage } from "@/lib/entitlements/gate-messages";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import { cn } from "@/lib/utils";

type Props = {
  item: Omit<PlanCartItem, "addedAt">;
  addedFrom?: PlanCartAddedFrom;
  compact?: boolean;
  /** 그리드 카드 — 짧은 라벨 (담기+ / 담김 ✓) */
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
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const { has, add, remove } = usePlanCart();
  const { isPro } = useIsPro();
  const inPlan = has(item.mediaId);
  const payload = { ...item, addedFrom: addedFrom ?? item.addedFrom };

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (inPlan) {
      remove(item.mediaId);
      toast.success(
        isKo
          ? `${item.mediaName}을(를) 담은 매체에서 뺐어요`
          : `Removed ${item.mediaName} from your plan`,
      );
      return;
    }
    const result = add(payload);
    if (result.ok && result.added) {
      toast.success(
        isKo
          ? `${item.mediaName}을(를) 담은 매체에 담았어요`
          : `Added ${item.mediaName} to your plan`,
      );
      return;
    }
    if (result.ok && !result.added) {
      toast.warning(isKo ? "이미 담은 매체에 있습니다" : "Already in your plan");
      return;
    }
    toast.show({
      variant: "warning",
      title: isKo ? "담은 매체 한도" : "Plan cart limit",
      description: buildPlanCartLimitMessage(isKo, isPro),
    });
  }

  if (gridInline) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(mediaActionPillClass(inPlan, "cart"), className)}
        aria-pressed={inPlan}
        aria-label={inPlan ? (isKo ? "담은 매체에서 제거" : "Remove from plan") : (isKo ? "담은 매체에 담기" : "Add to plan")}
      >
        {inPlan ? (
          <>
            <Check className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
            {isKo ? "담김 ✓" : "On ✓"}
          </>
        ) : (
          <>
            <Plus className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
            {isKo ? "담기+" : "Add+"}
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-1 whitespace-normal rounded-xl border font-semibold transition active:scale-95",
        compact ? "h-9 px-2.5 text-xs" : "h-10 px-3 text-xs",
        inPlan
          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-100"
          : "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/12 dark:bg-white/10 dark:text-white/90",
        className,
      )}
      aria-pressed={inPlan}
      aria-label={inPlan ? (isKo ? "담은 매체에서 제거" : "Remove from plan") : (isKo ? "담은 매체에 담기" : "Add to plan")}
    >
      {inPlan ? (
        <>
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {isKo ? "담김 ✓" : "Added ✓"}
        </>
      ) : (
        <>
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {isKo ? "담기+" : "Add+"}
        </>
      )}
    </button>
  );
}
