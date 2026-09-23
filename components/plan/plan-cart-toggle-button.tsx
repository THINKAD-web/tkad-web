"use client";

import { Plus, ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  mediaActionBlockClass,
  mediaActionPillClass,
} from "@/components/media/media-action-pill";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { useIsPro } from "@/hooks/use-is-pro";
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
  /** 담기 성공 직후 (GA map_preview_cta 등) */
  onAddSuccess?: () => void;
};

/** 매체 목록·지도 공통 — 담은 매체(plan cart) 담기 토글 */
export function PlanCartToggleButton({
  item,
  addedFrom,
  gridInline = false,
  feedLabeled = false,
  iconOnly = false,
  className,
  onAddSuccess,
}: Props) {
  const locale = useLocale();
  const useKo = locale === "ko" || locale.startsWith("ko");
  const t = useTranslations("planCart");
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
      toast.success(t("removedToast", { name: item.mediaName }));
      return;
    }
    const result = add(payload);
    if (result.ok && result.added) {
      onAddSuccess?.();
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

  const removeHint = t("removeHint");

  const label = feedLabeled
    ? inCart
      ? t("remove")
      : t("addToPlan")
    : gridInline
      ? inCart
        ? t("removeShort")
        : t("addShort")
      : inCart
        ? t("remove")
        : t("addShort");

  const ariaLabel = inCart ? t("ariaRemove") : t("ariaAdd");

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
