"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { GitCompare, LayoutList, Trash2, X } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { FloatingSelectionBar } from "@/components/floating-selection-bar";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_DISABLED,
  STICKY_ACTION_BAR_BTN_ICON,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_PRIMARY,
  STICKY_ACTION_BAR_ROW,
} from "@/components/sticky-action-bar";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { PlanCartSheet } from "@/components/plan/plan-cart-sheet";
import { formatPlanCartBadgeCount } from "@/lib/plan-cart-limits";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import {
  buildSelectionQuoteHref,
  formatSelectionCountLabel,
} from "@/lib/media-selection-bar";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Props {
  items: MediaItem[];
  locale: string;
  onClear: () => void;
  /** 지도 페이지 — 라이트·컴팩트 하단 바 */
  variant?: "default" | "light";
}

/**
 * 매체검색 — 비교 카트가 있을 때 하단 고정 팝업.
 */
export default function CompareBar({
  items,
  locale,
  onClear,
  variant = "default",
}: Props) {
  const t = useTranslations("media");
  const tPlan = useTranslations("planNav");
  const pathname = usePathname();
  const { cart, count: planCount, clear: clearPlanCart } = usePlanCart();
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const isKo = locale === "ko";
  const isLight = variant === "light";
  const isMapPage = pathname?.includes("/media/map") ?? false;
  const hidePlanOnPage = pathname?.includes("/my/plan") ?? false;
  const showPlanInBar = !hidePlanOnPage && planCount > 0;
  const stashRef = useRef<MediaItem[]>([]);
  /* eslint-disable react-hooks/refs -- items=[]인 exit 프레임에서만 스냅샷 읽기 */
  if (items.length > 0) stashRef.current = items;
  const open = items.length > 0 || planCount > 0;
  const displayItems = open ? items : stashRef.current;
  /* eslint-enable react-hooks/refs */

  const hasCompareSelection = displayItems.length > 0;
  const compareHref = `/compare?ids=${displayItems.map((m) => m.id).join(",")}`;
  const quoteHref = buildSelectionQuoteHref(
    displayItems,
    cart.items.map((i) => i.mediaId),
  );
  const count = displayItems.length;
  const canCompare = count >= 2;
  const countLabel = formatSelectionCountLabel(planCount, count, isKo);

  const blockClass =
    "w-full min-h-12 min-w-0 justify-center px-2 text-[11px] sm:min-h-10 sm:px-4 sm:text-[12px]";

  if (isLight) {
    return (
      <>
        <PlanCartSheet
          open={planSheetOpen}
          onOpenChange={setPlanSheetOpen}
          isKo={isKo}
        />
        <FloatingSelectionBar
          open={open}
          variant="neon"
          compact
          aboveMobileChrome
          hideSpacer={isMapPage}
          ariaLabel={isKo ? "선택한 매체·플랜 작업" : "Selected media and plan actions"}
        >
          <div className={STICKY_ACTION_BAR_ROW}>
            <span
              className="min-w-0 flex-1 truncate text-[10px] font-medium tabular-nums text-gray-600 dark:text-white/55"
              aria-live="polite"
            >
              {countLabel}
            </span>

            {showPlanInBar ? (
              <>
                <button
                  type="button"
                  onClick={() => setPlanSheetOpen(true)}
                  className={cn(
                    STICKY_ACTION_BAR_BTN,
                    STICKY_ACTION_BAR_BTN_IDLE,
                    STICKY_ACTION_BAR_BTN_ICON,
                  )}
                  aria-label={tPlan("cart")}
                  title={tPlan("cart")}
                >
                  <LayoutList className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={clearPlanCart}
                  className={cn(
                    STICKY_ACTION_BAR_BTN,
                    STICKY_ACTION_BAR_BTN_IDLE,
                    STICKY_ACTION_BAR_BTN_ICON,
                  )}
                  aria-label={isKo ? "담기해제" : "Clear saved"}
                  title={isKo ? "담기해제" : "Clear saved"}
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
              </>
            ) : null}

            {hasCompareSelection ? (
              <>
                <button
                  type="button"
                  onClick={onClear}
                  className={cn(
                    STICKY_ACTION_BAR_BTN,
                    STICKY_ACTION_BAR_BTN_IDLE,
                    STICKY_ACTION_BAR_BTN_ICON,
                  )}
                  aria-label={t("compareFloatingClear")}
                  title={t("compareFloatingClear")}
                >
                  <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
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

            {hasCompareSelection || showPlanInBar ? (
              <Link
                href={quoteHref}
                className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_PRIMARY)}
              >
                {t("compareQuoteCta")}
              </Link>
            ) : null}
          </div>
        </FloatingSelectionBar>
      </>
    );
  }

  return (
    <>
      <PlanCartSheet
        open={planSheetOpen}
        onOpenChange={setPlanSheetOpen}
        isKo={isKo}
      />
      <FloatingSelectionBar
        open={open}
        className="border-t-2 border-accent bg-hero-void/95 px-2 pb-2 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.5)] sm:px-4 sm:pb-3"
        ariaLabel={isKo ? "선택한 매체·플랜 작업" : "Selected media and plan actions"}
      >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div
          className="flex min-w-0 items-center gap-2 sm:gap-2.5"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="min-w-0 font-display text-xs font-medium uppercase tabular-nums tracking-[0.12em] text-hero-fg/95 sm:text-sm">
            {countLabel}
          </span>
        </div>

        <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-2">
          {showPlanInBar ? (
            <>
              <BtnBlock
                type="button"
                onClick={() => setPlanSheetOpen(true)}
                variant="secondary"
                size="sm"
                className={cn(blockClass, "whitespace-nowrap")}
              >
                {tPlan("cart")} ({formatPlanCartBadgeCount(planCount)})
              </BtnBlock>
              <BtnBlock
                type="button"
                onClick={clearPlanCart}
                variant="secondary"
                size="sm"
                className={blockClass}
              >
                {isKo ? "담기해제" : "Clear saved"}
              </BtnBlock>
            </>
          ) : null}
          {hasCompareSelection ? (
            <>
          <BtnBlock
            type="button"
            onClick={onClear}
            variant="secondary"
            size="sm"
            className={blockClass}
          >
            {t("compareFloatingClear")}
          </BtnBlock>
          {canCompare ? (
            <BtnBlock
              href={compareHref}
              variant="secondary"
              size="sm"
              className={blockClass}
            >
              {t("compareFloatingCompare")}
            </BtnBlock>
          ) : (
            <BtnBlock
              type="button"
              disabled
              variant="secondary"
              size="sm"
              title={
                isKo
                  ? "비교하려면 매체를 2개 이상 선택하세요"
                  : "Select at least two media to compare"
              }
              className={cn(blockClass, "opacity-40")}
            >
              {t("compareFloatingCompare")}
            </BtnBlock>
          )}
            </>
          ) : null}
          {hasCompareSelection || showPlanInBar ? (
            <BtnBlock
              href={quoteHref}
              variant="accent"
              size="sm"
              className={cn(
                blockClass,
                "min-w-[104px] whitespace-nowrap text-white",
                "border-gray-200 bg-[linear-gradient(135deg,rgba(34,211,238,0.95)_0%,rgba(168,85,247,0.92)_52%,rgba(236,72,153,0.88)_100%)] dark:border-white/12",
                "hover:!bg-[linear-gradient(135deg,rgba(34,211,238,1)_0%,rgba(168,85,247,0.98)_52%,rgba(236,72,153,0.96)_100%)]",
                "shadow-[0_18px_60px_rgba(0,0,0,0.55)]",
              )}
            >
              {t("compareQuoteCta")}
            </BtnBlock>
          ) : null}
        </div>
      </div>
    </FloatingSelectionBar>
    </>
  );
}
