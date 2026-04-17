"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { FloatingSelectionBar } from "@/components/floating-selection-bar";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import type { MediaItem } from "@/lib/media-data";
import { useTranslations } from "next-intl";

interface Props {
  items: MediaItem[];
  locale: string;
  onClear: () => void;
}

/**
 * 매체검색 — 비교 카트가 있을 때 하단 고정 팝업.
 * ✓ N개 선택됨 · [선택해제] [비교하기] [견적받기]
 */
export default function CompareBar({ items, locale, onClear }: Props) {
  const t = useTranslations("media");
  const isKo = locale === "ko";
  const [stashed, setStashed] = useState<MediaItem[]>(items);
  const open = items.length > 0;
  if (open && items !== stashed) {
    setStashed(items);
  }
  const displayItems = open ? items : stashed;

  const ids = displayItems.map((m) => m.id).join(",");
  const compareHref = `/compare?ids=${displayItems.map((m) => m.id).join(",")}`;
  const quoteHref = `/quote?media=${ids}`;

  const count = displayItems.length;
  const canCompare = count >= 2;

  return (
    <FloatingSelectionBar
      open={open}
      ariaLabel={isKo ? "선택한 매체 작업" : "Selected media actions"}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div
          className="flex min-w-0 items-center gap-2 sm:gap-2.5"
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold leading-none text-emerald-700"
            aria-hidden
          >
            ✓
          </span>
          <span className="min-w-0 truncate text-sm font-semibold tabular-nums text-navy sm:text-base">
            {t("compareFloatingSelected", { count })}
            <span className="sr-only">
              {" "}
              ({count}/{COMPARE_MAX_ITEMS})
            </span>
          </span>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-2">
          <Button
            type="button"
            variant="floatingSecondary"
            size="floating"
            onClick={onClear}
            className="min-w-0 px-2 text-xs sm:min-h-12 sm:px-5 sm:text-sm"
          >
            {t("compareFloatingClear")}
          </Button>
          {canCompare ? (
            <Button
              asChild
              variant="floatingSecondary"
              size="floating"
              className="min-w-0 px-2 text-xs font-semibold sm:min-h-12 sm:px-5 sm:text-sm"
            >
              <Link href={compareHref}>{t("compareFloatingCompare")}</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="floatingSecondary"
              size="floating"
              disabled
              className="min-w-0 px-2 text-xs sm:min-h-12 sm:px-5 sm:text-sm"
              title={
                isKo
                  ? "비교하려면 매체를 2개 이상 선택하세요"
                  : "Select at least two media to compare"
              }
            >
              {t("compareFloatingCompare")}
            </Button>
          )}
          <Button
            asChild
            variant="floatingPrimary"
            size="floating"
            className="min-w-0 px-2 text-xs sm:min-h-12 sm:px-5 sm:text-sm"
          >
            <Link href={quoteHref}>{t("compareQuoteCta")}</Link>
          </Button>
        </div>
      </div>
    </FloatingSelectionBar>
  );
}
