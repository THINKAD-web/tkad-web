"use client";

import { Check, Plus, ShoppingBag, X } from "lucide-react";
import { useLocale } from "next-intl";
import {
  mediaActionBlockClass,
  mediaActionPillClass,
} from "@/components/media/media-action-pill";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { useAppToast } from "@/lib/use-toast";
import { buildPlanCartLimitMessage } from "@/lib/entitlements/gate-messages";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import { planCartAddBlockedMessage } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";

type Props = {
  item: Omit<PlanCartItem, "addedAt">;
  addedFrom?: PlanCartAddedFrom;
  /** 그리드 카드 — 짧은 라벨 (담기 / 빼기) */
  gridInline?: boolean;
  /** 피드 카드 — 아이콘 + 긴 라벨 */
  feedLabeled?: boolean;
  /** 아이콘만 (릴스 등 정사각 버튼) */
  iconOnly?: boolean;
  className?: string;
};

/** 매체 목록·지도 공통 — 담은 매체(plan cart) 담기 토글 */
export function PlanCartToggleButton({
  item,
  addedFrom,
  gridInline = false,
  feedLabeled = false,
  iconOnly = false,
  className,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const toast = useAppToast();
  const { has, add, remove, isPro } = usePlanCart();
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
    if (!result.ok && result.reason === "online_blocked") {
      toast.warning(planCartAddBlockedMessage(item, isKo));
      return;
    }
    toast.show({
      variant: "warning",
      title: isKo ? "담은 매체 한도" : "Plan cart limit",
      description: buildPlanCartLimitMessage(isKo, isPro),
    });
  }

  const removeHint = isKo ? "다시 누르면 빼기" : "Tap again to remove";

  const label = feedLabeled
    ? inCart
      ? isKo
        ? "빼기"
        : "Remove"
      : isKo
        ? "매체 담기"
        : "Add media"
    : gridInline
      ? inCart
        ? isKo
          ? "빼기"
          : "Out"
        : isKo
          ? "담기"
          : "Add"
      : inCart
        ? isKo
          ? "빼기"
          : "Remove"
        : isKo
          ? "담기"
          : "Add";

  const ariaLabel = inCart
    ? isKo
      ? "담은 매체에서 제거 (다시 누르면 빼기)"
      : "Remove from plan (tap again to remove)"
    : isKo
      ? "담은 매체에 담기"
      : "Add to plan";

  return (
    <button
      type="button"
      onClick={handleClick}
      title={inCart ? removeHint : undefined}
      className={cn(
        iconOnly
          ? cn(
              "inline-flex h-10 w-10 min-w-10 items-center justify-center rounded-xl border transition-colors",
              inCart
                ? "border-rose-400/55 bg-rose-500/20 text-rose-100"
                : "border-white/20 bg-white/10 text-white hover:bg-white/20",
            )
          : feedLabeled
            ? mediaActionBlockClass(inCart, "cart", "h-8 flex-1 px-2 text-[11px]")
            : mediaActionPillClass(inCart, "cart"),
        className,
      )}
      aria-pressed={inCart}
      aria-label={ariaLabel}
    >
      {iconOnly ? (
        inCart ? (
          <X className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ShoppingBag className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        )
      ) : feedLabeled ? (
        inCart ? (
          <X className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        ) : (
          <ShoppingBag className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        )
      ) : null}
      {!iconOnly ? (
        <>
          {!feedLabeled ? (
            inCart ? (
              <X className="h-2.5 w-2.5 shrink-0 opacity-90" aria-hidden />
            ) : (
              <Plus className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden />
            )
          ) : null}
          {label}
        </>
      ) : null}
    </button>
  );
}
