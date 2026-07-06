"use client";

import { useState } from "react";
import { GitCompare, LayoutList } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_DISABLED,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_PRIMARY,
  STICKY_ACTION_BAR_ROW,
  StickyActionBar,
} from "@/components/sticky-action-bar";
import { PlanCartSheet } from "@/components/plan/plan-cart-sheet";
import { usePlanCart } from "@/hooks/use-plan-cart";
import {
  buildSelectionQuoteHref,
  formatSelectionCountLabel,
} from "@/lib/media-selection-bar";
import type { MediaItem } from "@/lib/media-data";
import { cn } from "@/lib/utils";

type Props = {
  items: MediaItem[];
  locale: string;
  onClearCompare: () => void;
};

/**
 * `/media` 목록 모바일 — 담기·비교 카운트 동시 표시 (집합은 각각 유지)
 */
export function MediaBrowseStickyBar({
  items,
  locale,
  onClearCompare,
}: Props) {
  const isKo = locale === "ko";
  const { cart, count: planCount, clear: clearPlanCart } = usePlanCart();
  const [planSheetOpen, setPlanSheetOpen] = useState(false);

  const compareCount = items.length;
  const canCompare = compareCount >= 2;
  const compareHref = `/compare?ids=${items.map((m) => m.id).join(",")}`;
  const quoteHref = buildSelectionQuoteHref(
    items,
    cart.items.map((i) => i.mediaId),
  );
  const showBar = compareCount > 0 || planCount > 0;
  const countLabel = formatSelectionCountLabel(planCount, compareCount, isKo);

  return (
    <>
      <PlanCartSheet
        open={planSheetOpen}
        onOpenChange={setPlanSheetOpen}
        isKo={isKo}
      />
      <StickyActionBar
        open={showBar}
        layout="dock"
        variant="neon"
        compact
        aboveMobileChrome
        ariaLabel={isKo ? "담기·비교" : "Saved and compare"}
        className="lg:hidden"
      >
        <div className={STICKY_ACTION_BAR_ROW}>
          <span
            className="min-w-0 flex-1 truncate text-[10px] font-medium tabular-nums text-gray-600 dark:text-white/55"
            aria-live="polite"
          >
            {countLabel}
          </span>

          {planCount > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setPlanSheetOpen(true)}
                className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE)}
                title={isKo ? "담은 매체 보기·개별 해제" : "View saved media"}
              >
                <LayoutList className="h-3 w-3 shrink-0" aria-hidden />
                {isKo ? "플랜" : "Plan"}
              </button>
              <button
                type="button"
                onClick={clearPlanCart}
                className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE)}
              >
                {isKo ? "담기해제" : "Clear saved"}
              </button>
            </>
          ) : null}

          {compareCount > 0 ? (
            <>
              <button
                type="button"
                onClick={onClearCompare}
                className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE)}
              >
                {isKo ? "비교해제" : "Clear compare"}
              </button>
              {canCompare ? (
                <Link
                  href={compareHref}
                  className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE)}
                >
                  <GitCompare className="h-3 w-3 shrink-0" aria-hidden />
                  {isKo ? "비교" : "Compare"}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_DISABLED)}
                >
                  <GitCompare className="h-3 w-3 shrink-0" aria-hidden />
                  {isKo ? "비교" : "Compare"}
                </button>
              )}
            </>
          ) : null}

          {compareCount > 0 || planCount > 0 ? (
            <Link
              href={quoteHref}
              className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_PRIMARY)}
            >
              {isKo ? "견적" : "Quote"}
            </Link>
          ) : null}
        </div>
      </StickyActionBar>
    </>
  );
}
