"use client";

import { Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { useAppToast } from "@/lib/use-toast";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { useIsPro } from "@/hooks/use-is-pro";
import { buildPlanCartLimitMessage } from "@/lib/entitlements/gate-messages";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import { planCartAddBlockedMessage } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";

type Props = {
  item: Omit<PlanCartItem, "addedAt">;
  addedFrom?: PlanCartAddedFrom;
  compact?: boolean;
  /** 그리드 카드 — 짧은 라벨 (담기 / 빼기) */
  gridInline?: boolean;
  /** 매체 상세 — "플래너에 담기" 라벨 + 용도 힌트 */
  mediaDetailLabel?: boolean;
  className?: string;
};

export function PlanCartAddButton({
  item,
  addedFrom,
  compact = false,
  gridInline = false,
  mediaDetailLabel = false,
  className,
}: Props) {
  const locale = useLocale();
  const useKo = locale === "ko";
  const t = useTranslations("planCart");
  const toast = useAppToast();
  const { has, add, remove } = usePlanCart();
  const { isPro } = useIsPro();
  const inPlan = has(item.mediaId);
  const payload = { ...item, addedFrom: addedFrom ?? item.addedFrom };
  const removeHint = t("removeHint");
  const addLabel = mediaDetailLabel ? t("addToPlanner") : t("add");
  const addHint = mediaDetailLabel ? t("addToPlannerHint") : undefined;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (inPlan) {
      remove(item.mediaId);
      toast.success(t("removedToast", { name: item.mediaName }));
      return;
    }
    const result = add(payload);
    if (result.ok && result.added) {
      toast.success(t("addedToast", { name: item.mediaName }));
      return;
    }
    if (result.ok && !result.added) {
      toast.warning(t("alreadyInPlan"));
      return;
    }
    if (!result.ok && result.reason === "online_blocked") {
      toast.warning(planCartAddBlockedMessage(item, useKo));
      return;
    }
    toast.show({
      variant: "warning",
      title: t("limitTitle"),
      description: buildPlanCartLimitMessage(useKo, isPro),
    });
  }

  if (gridInline) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={inPlan ? removeHint : addHint}
        className={cn(mediaActionPillClass(inPlan, "cart"), className)}
        aria-pressed={inPlan}
        aria-label={inPlan ? t("ariaRemove") : t("ariaAdd")}
      >
        {inPlan ? (
          <>
            <X className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
            {t("removeShort")}
          </>
        ) : (
          <>
            <Plus className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
            {t("addShort")}
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={inPlan ? removeHint : addHint}
      className={cn(
        "inline-flex max-w-full items-center justify-center gap-1 whitespace-normal rounded-xl border font-semibold transition active:scale-95",
        compact ? "h-9 px-2.5 text-xs" : "h-10 px-3 text-xs",
        inPlan
          ? "border-rose-400/55 bg-rose-500/15 text-rose-800 dark:border-rose-400/45 dark:bg-rose-500/20 dark:text-rose-100"
          : "border-gray-200 bg-gray-100 text-gray-800 dark:border-white/12 dark:bg-white/10 dark:text-white/90",
        className,
      )}
      aria-pressed={inPlan}
      aria-label={
        inPlan
          ? t("ariaRemove")
          : mediaDetailLabel
            ? t("addToPlanner")
            : t("ariaAdd")
      }
    >
      {inPlan ? (
        <>
          <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("remove")}
        </>
      ) : (
        <>
          <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {addLabel}
        </>
      )}
    </button>
  );
}
