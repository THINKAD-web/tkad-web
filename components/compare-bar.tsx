"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutList } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import {
  FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS,
  FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS,
  FloatingSelectionBar,
} from "@/components/floating-selection-bar";
import { useCartCompareMax } from "@/hooks/use-cart-compare-max";
import { usePlanCart } from "@/hooks/use-plan-cart";
import { isCartCompareUnlimited } from "@/lib/entitlements/limits";
import { formatPlanCartBadgeCount } from "@/lib/plan-cart-limits";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Props {
  items: MediaItem[];
  locale: string;
  onClear: () => void;
  /** 지도 페이지 — 라이트·컴팩트 하단 바 */
  variant?: "default" | "light";
}

const lightBtn =
  "inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-full border border-gray-200 bg-white px-2 text-[11px] font-semibold text-gray-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-white/12 dark:bg-white/8 dark:text-white dark:hover:bg-white/12 sm:flex-none sm:px-3";

const lightPlanBtn =
  "inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-violet-300/50 bg-gradient-to-r from-violet-500/90 to-cyan-400/90 px-2 text-[11px] font-semibold text-white shadow-sm shadow-violet-500/20 sm:flex-none sm:min-w-[72px] sm:px-3";

function useIsMdUp() {
  const [isMdUp, setIsMdUp] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsMdUp(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMdUp;
}

function PlanCartBarLink({
  count,
  isKo,
  className,
}: {
  count: number;
  isKo: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/my/plan"
      className={className}
      aria-label={isKo ? `내 플랜 ${count}개` : `My plan ${count} items`}
    >
      <LayoutList className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {isKo ? "내 플랜" : "My plan"}
      <span className="tabular-nums">{formatPlanCartBadgeCount(count)}</span>
    </Link>
  );
}

/**
 * 매체검색 — 비교 카트가 있을 때 하단 고정 팝업.
 * ✓ N개 선택됨 · [선택해제] [비교하기] [견적받기]
 */
export default function CompareBar({
  items,
  locale,
  onClear,
  variant = "default",
}: Props) {
  const t = useTranslations("media");
  const pathname = usePathname();
  const { count: planCount } = usePlanCart();
  const { maxItems: compareMax } = useCartCompareMax();
  const isKo = locale === "ko";
  const isLight = variant === "light";
  const hidePlanOnPage = pathname?.includes("/my/plan") ?? false;
  const showPlanLink = !hidePlanOnPage && planCount > 0;
  const isMdUp = useIsMdUp();
  /** 모바일은 퀵액션 바(/my/plan) — CompareBar 내 플랜은 md+ only */
  const showPlanInBar = showPlanLink && isMdUp;
  /** 비우기 직후 exit 애니메이션에서도 직전 선택 목록 라벨을 유지 */
  const stashRef = useRef<MediaItem[]>([]);
  /* eslint-disable react-hooks/refs -- items=[]인 exit 프레임에서만 스냅샷 읽기 */
  if (items.length > 0) stashRef.current = items;
  const open = items.length > 0 || showPlanInBar;
  const displayItems = open ? items : stashRef.current;
  /* eslint-enable react-hooks/refs */

  const hasCompareSelection = displayItems.length > 0;

  const ids = displayItems.map((m) => m.id).join(",");
  const compareHref = `/compare?ids=${displayItems.map((m) => m.id).join(",")}`;
  const one = displayItems[0];
  const onlyPo =
    displayItems.length === 1 && (one?.priceOptions?.length ?? 0) > 0
      ? "&po=0"
      : "";
  const quoteHref = `/quote?media=${ids}${onlyPo}`;

  const count = displayItems.length;
  const compareLimitLabel = isCartCompareUnlimited(compareMax)
    ? String(count)
    : `${count}/${compareMax}`;
  const canCompare = count >= 2;

  const blockClass =
    "w-full min-h-12 min-w-0 justify-center px-2 text-[11px] sm:min-h-10 sm:px-4 sm:text-[12px]";

  const spacerClass = isLight
    ? FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS
    : FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS;

  if (isLight) {
    return (
      <>
        {open ? <div className={spacerClass} aria-hidden /> : null}
        <FloatingSelectionBar
          open={open}
          variant="neon"
          compact
          aboveMobileChrome
          ariaLabel={isKo ? "선택한 매체·플랜 작업" : "Selected media and plan actions"}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div
              className="flex min-w-0 items-center gap-1.5"
              aria-live="polite"
              aria-atomic="true"
            >
              {hasCompareSelection ? (
                <>
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-violet-300/60 bg-violet-50 text-[11px] font-bold leading-none text-violet-600 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-300"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="min-w-0 text-xs font-semibold tabular-nums text-gray-900 dark:text-white sm:text-[13px]">
                    {t("compareFloatingSelected", { count })}
                    <span className="sr-only">
                      {" "}
                      ({compareLimitLabel})
                    </span>
                  </span>
                </>
              ) : showPlanInBar ? (
                <span className="min-w-0 text-xs font-semibold text-gray-900 dark:text-white sm:text-[13px]">
                  {isKo
                    ? `내 플랜 · ${planCount}개 매체`
                    : `My plan · ${planCount} media`}
                </span>
              ) : null}
            </div>

            <div
              className={cn(
                "grid w-full gap-1 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-1.5",
                hasCompareSelection && showPlanInBar
                  ? "grid-cols-4"
                  : hasCompareSelection
                    ? "grid-cols-3"
                    : "grid-cols-1",
              )}
            >
              {showPlanInBar ? (
                <PlanCartBarLink
                  count={planCount}
                  isKo={isKo}
                  className={cn(lightPlanBtn, "hidden md:inline-flex")}
                />
              ) : null}
              {hasCompareSelection ? (
                <>
                  <button type="button" onClick={onClear} className={lightBtn}>
                    {t("compareFloatingClear")}
                  </button>
                  {canCompare ? (
                    <Link href={compareHref} className={lightBtn}>
                      {t("compareFloatingCompare")}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={
                        isKo
                          ? "비교하려면 매체를 2개 이상 선택하세요"
                          : "Select at least two media to compare"
                      }
                      className={cn(lightBtn, "opacity-40")}
                    >
                      {t("compareFloatingCompare")}
                    </button>
                  )}
                  <Link
                    href={quoteHref}
                    className="inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-full tkad-neon-cta-clean px-2 text-[11px] font-semibold text-white whitespace-nowrap sm:flex-none sm:min-w-[72px] sm:px-3"
                  >
                    {t("compareQuoteCta")}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </FloatingSelectionBar>
      </>
    );
  }

  return (
    <>
      {open ? <div className={spacerClass} aria-hidden /> : null}
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
          {hasCompareSelection ? (
            <>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-accent bg-hero-void text-sm font-bold leading-none text-accent"
                aria-hidden
              >
                ✓
              </span>
              <span className="min-w-0 font-display text-xs font-medium uppercase tabular-nums tracking-[0.12em] text-hero-fg/95 sm:text-sm">
                {t("compareFloatingSelected", { count })}
                <span className="sr-only">
                  {" "}
                  ({compareLimitLabel})
                </span>
              </span>
            </>
          ) : showPlanInBar ? (
            <span className="min-w-0 font-display text-xs font-medium uppercase tracking-[0.12em] text-hero-fg/95 sm:text-sm">
              {isKo
                ? `내 플랜 · ${planCount}개 매체`
                : `My plan · ${planCount} media`}
            </span>
          ) : null}
        </div>

        <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-2">
          {showPlanInBar ? (
            <BtnBlock
              href="/my/plan"
              variant="secondary"
              size="sm"
              className={cn(blockClass, "hidden whitespace-nowrap md:inline-flex")}
            >
              {isKo ? "내 플랜" : "My plan"} ({formatPlanCartBadgeCount(planCount)})
            </BtnBlock>
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
            </>
          ) : null}
        </div>
      </div>
    </FloatingSelectionBar>
    </>
  );
}
