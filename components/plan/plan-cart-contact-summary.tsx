"use client";

import { useLocale } from "next-intl";
import { usePlanCart } from "@/hooks/use-plan-cart";
import {
  PLAN_CART_GOAL_OPTIONS,
  planCartMonthlyTotal,
} from "@/lib/plan-cart";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";

export function PlanCartContactSummary() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const { cart } = usePlanCart();

  if (cart.items.length === 0) return null;

  const monthly = planCartMonthlyTotal(cart);
  const duration = cart.duration ?? 1;
  const goalLabel =
    PLAN_CART_GOAL_OPTIONS.find((g) => g.value === cart.campaignGoal)?.[
      isKo ? "ko" : "en"
    ] ?? (isKo ? "미정" : "TBD");

  function formatWon(amount: number) {
    if (amount <= 0) return isKo ? "문의" : "Inquire";
    return formatCatalogPriceFieldWon(amount, isKo ? "ko-KR" : "en-US");
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 text-sm dark:text-white text-gray-800">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-violet-400/90">
        {isKo ? "📋 선택하신 플랜" : "📋 Your plan"}
      </p>
      <ol className="mt-3 space-y-1.5 text-sm font-medium leading-relaxed">
        {cart.items.map((item, idx) => (
          <li key={item.mediaId}>
            {idx + 1}. {item.mediaName}
          </li>
        ))}
      </ol>
      <div className="mt-3 space-y-1 border-t border-violet-500/20 pt-3 text-xs dark:text-white/70 text-gray-600">
        <p>
          {isKo ? "월 총 예산" : "Monthly total"}: {formatWon(monthly)}
        </p>
        <p>
          {isKo ? "기간" : "Duration"}: {duration}
          {isKo ? "개월" : " mo"} / {isKo ? "목표" : "Goal"}: {goalLabel}
        </p>
      </div>
    </div>
  );
}
