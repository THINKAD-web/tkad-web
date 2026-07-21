"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { planCartMonthlyTotal } from "@/lib/plan-cart";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { formatCatalogPriceFieldWon, mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
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
    if (amount <= 0) return mediaPriceOnInquiryLabel(localeTag);
    return formatCatalogPriceFieldWon(amount, localeTag);
  }

  return (
    <div className="mb-4 rounded-2xl border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent-soft)] p-4">
      <p className="text-sm font-bold text-[color:var(--qp-accent)]">
        {isKo ? "📋 플래너에서 선택한 매체" : "📋 Media from planner"}
      </p>
      <ul className="mt-3 space-y-2">
        {cart.items.map((item) => (
          <li
            key={item.mediaId}
            className="flex items-start justify-between gap-3 text-sm text-gray-800 dark:text-white/90"
          >
            <span className="min-w-0 font-medium">{item.mediaName}</span>
            <span className="shrink-0 tabular-nums text-[color:var(--qp-accent)]">
              {formatWon(item.price)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-[color:var(--qp-accent)]/25 pt-3 text-sm font-bold text-[color:var(--qp-accent)]">
        {isKo ? "총 예산" : "Total budget"}: {formatWon(totalBudget)}
        {monthly > 0 && totalBudget !== monthly ? (
          <span className="ml-2 text-xs font-normal text-[color:var(--qp-accent)]/80">
            ({isKo ? "월" : "mo"} {formatWon(monthly)})
          </span>
        ) : null}
      </p>
      <MediaPriceExclNote isKo={isKo} className="mt-2" />
    </div>
  );
}

export const PlanSummaryCard = withSearchParamsSuspense(PlanSummaryCardInner);
