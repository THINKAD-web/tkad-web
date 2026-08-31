"use client";

import { getProPriceDisplay } from "@/lib/entitlements/pricing";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  className?: string;
  size?: "card" | "inline";
};

/** PRO 월 요금 — entitlements 할인율 반영 (원가 취소선 + 할인가 + 뱃지) */
export function ProMonthlyPriceDisplay({
  isKo,
  className,
  size = "card",
}: Props) {
  const d = getProPriceDisplay();
  const priceClass =
    size === "card"
      ? "text-2xl font-black text-gray-900 dark:text-white"
      : "font-bold tabular-nums";

  return (
    <div className={cn("space-y-1", className)}>
      {d.hasDiscount ? (
        <span className="inline-flex items-center rounded-full border border-pink-400/40 bg-pink-500/10 px-2 py-0.5 tkad-type-note font-bold uppercase tracking-wide text-pink-700 dark:text-pink-200">
          {isKo ? `${d.discountPercent}% 할인` : `${d.discountPercent}% off`}
        </span>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {d.hasDiscount ? (
          <span
            className={cn(
              "tkad-type-title text-gray-400 line-through decoration-gray-400/80 dark:text-white/35",
              size === "card" && "text-base",
            )}
            aria-hidden
          >
            {isKo
              ? `월 ₩${d.listPriceKrw.toLocaleString("ko-KR")}`
              : `₩${d.listPriceKrw.toLocaleString("en-US")}/mo`}
          </span>
        ) : null}
        <p className={priceClass}>
          {isKo
            ? `월 ₩${d.salePriceKrw.toLocaleString("ko-KR")}`
            : `₩${d.salePriceKrw.toLocaleString("en-US")}/mo`}
        </p>
      </div>
    </div>
  );
}
