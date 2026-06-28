"use client";

import { ShoppingBag } from "lucide-react";
import { useLocale } from "next-intl";
import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { useIsPro } from "@/hooks/use-is-pro";
import { useAppToast } from "@/lib/use-toast";
import { buildPlanCartLimitMessage } from "@/lib/entitlements/gate-messages";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import { cn } from "@/lib/utils";

type Props = {
  item: Omit<PlanCartItem, "addedAt">;
  addedFrom?: PlanCartAddedFrom;
  /** 그리드 카드 — 짧은 라벨 (담기+ / 담김) */
  gridInline?: boolean;
  /** 피드 카드 — 아이콘 + 긴 라벨 */
  feedLabeled?: boolean;
  className?: string;
};

/** 매체 목록·지도 공통 — 담은 매체(plan cart) 담기 토글 */
export function MediaCartAddButton({
  item,
  addedFrom,
  gridInline = false,
  feedLabeled = false,
  className,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const { has, add, remove } = usePlanCart();
  const { isPro } = useIsPro();
  const inCart = has(item.mediaId);
  const payload = { ...item, addedFrom: addedFrom ?? item.addedFrom };

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (inCart) {
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

  const label = feedLabeled
    ? inCart
      ? isKo
        ? "담김"
        : "Added"
      : isKo
        ? "매체 담기"
        : "Add media"
    : gridInline
      ? inCart
        ? isKo
          ? "담김"
          : "On"
        : isKo
          ? "담기+"
          : "Add"
      : inCart
        ? isKo
          ? "담김"
          : "On"
        : isKo
          ? "담기"
          : "Add";

  const ariaLabel = inCart
    ? isKo
      ? "담은 매체에서 제거"
      : "Remove from plan"
    : isKo
      ? "담은 매체에 담기"
      : "Add to plan";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        feedLabeled
          ? "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors"
          : mediaActionPillClass(inCart),
        feedLabeled &&
          (inCart
            ? "border-emerald-400/45 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200"
            : "border-gray-200/90 bg-white/90 text-gray-700 hover:bg-gray-50 dark:border-white/12 dark:bg-white/8 dark:text-white/90 dark:hover:bg-white/12"),
        className,
      )}
      aria-pressed={inCart}
      aria-label={ariaLabel}
    >
      {feedLabeled ? (
        <ShoppingBag className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      ) : null}
      {label}
    </button>
  );
}
