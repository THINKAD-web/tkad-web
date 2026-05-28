"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { planCartMonthlyTotal } from "@/lib/plan-cart";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";

function PlanSummaryCardInner() {
  const from = useSearchParams().get("from");
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const { cart } = usePlanCart();

  if (from !== "planner") return null;
  if (cart.items.length === 0) return null;

  const monthly = planCartMonthlyTotal(cart);
  const totalBudget = cart.totalBudget && cart.totalBudget > 0 ? cart.totalBudget : monthly;
  const localeTag = isKo ? "ko-KR" : "en-US";

  function formatWon(amount: number) {
    if (amount <= 0) return isKo ? "문의" : "Inquire";
    return formatCatalogPriceFieldWon(amount, localeTag);
  }

  return (
    <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
      <p className="text-sm font-bold text-violet-900 dark:text-violet-200">
        {isKo ? "📋 플래너에서 선택한 매체" : "📋 Media from planner"}
      </p>
      <ul className="mt-3 space-y-2">
        {cart.items.map((item) => (
          <li
            key={item.mediaId}
            className="flex items-start justify-between gap-3 text-sm text-gray-800 dark:text-white/90"
          >
            <span className="min-w-0 font-medium">{item.mediaName}</span>
            <span className="shrink-0 tabular-nums text-violet-700 dark:text-violet-300">
              {formatWon(item.price)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-violet-200/80 pt-3 text-sm font-bold text-violet-900 dark:border-violet-500/25 dark:text-violet-200">
        {isKo ? "총 예산" : "Total budget"}: {formatWon(totalBudget)}
        {monthly > 0 && totalBudget !== monthly ? (
          <span className="ml-2 text-xs font-normal text-violet-700/80 dark:text-violet-300/80">
            ({isKo ? "월" : "mo"} {formatWon(monthly)})
          </span>
        ) : null}
      </p>
    </div>
  );
}

export const PlanSummaryCard = withSearchParamsSuspense(PlanSummaryCardInner);
