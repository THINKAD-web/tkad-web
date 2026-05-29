"use client";

import { ShoppingBag } from "lucide-react";
import { useLocale } from "next-intl";
import { mediaActionPillClass } from "@/components/media/media-action-pill";
import { cn } from "@/lib/utils";

type Props = {
  inCart: boolean;
  onToggle: () => void;
  /** 그리드 카드 — 짧은 라벨 (담기+ / 담김) */
  gridInline?: boolean;
  /** 피드 카드 — 아이콘 + 긴 라벨 */
  feedLabeled?: boolean;
  className?: string;
};

/** 매체 목록·지도 공통 — 견적 장바구니 담기 토글 */
export function MediaCartAddButton({
  inCart,
  onToggle,
  gridInline = false,
  feedLabeled = false,
  className,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const label = feedLabeled
    ? inCart
      ? isKo
        ? "장바구니 담김"
        : "In cart"
      : isKo
        ? "견적 장바구니"
        : "Quote cart"
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
      ? "견적 장바구니에서 제거"
      : "Remove from quote cart"
    : isKo
      ? "견적 장바구니에 담기"
      : "Add to quote cart";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
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
