"use client";

import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";
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
 * 매체검색 — 비교 카트가 있을 때 하단 플로팅 바 (슬라이드 애니메이션).
 */
export default function CompareBar({ items, locale, onClear }: Props) {
  const t = useTranslations("media");
  const isKo = locale === "ko";
  const stashRef = useRef<MediaItem[]>([]);
  if (items.length > 0) stashRef.current = items;

  const open = items.length > 0;
  const displayItems = open ? items : stashRef.current;

  const ids = displayItems.map((m) => m.id).join(",");
  const compareHref = `/compare?ids=${displayItems.map((m) => m.id).join(",")}`;
  const quoteHref = `/quote?media=${ids}`;

  return (
    <FloatingSelectionBar
      open={open}
      ariaLabel={isKo ? "선택한 매체 작업" : "Selected media actions"}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
        <div
          className="flex min-w-0 items-center gap-2 text-base font-semibold text-navy md:text-sm"
          aria-live="polite"
          aria-atomic="true"
        >
          <CheckCircle2
            className="h-5 w-5 shrink-0 text-emerald-600 md:h-4 md:w-4"
            aria-hidden
          />
          <span className="truncate">
            {t("compareFloatingSelected", { count: displayItems.length })}
            <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground md:text-[11px]">
              ({displayItems.length}/{COMPARE_MAX_ITEMS})
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-stretch gap-2 md:shrink-0 md:justify-end">
          <Button
            type="button"
            variant="floatingSecondary"
            size="floating"
            onClick={onClear}
            className="flex-1 md:flex-none"
          >
            {t("compareFloatingClear")}
          </Button>
          {displayItems.length < 2 ? (
            <Button
              type="button"
              variant="floatingSecondary"
              size="floating"
              disabled
              className="flex-1 md:flex-none"
              title={
                isKo
                  ? "비교하려면 매체를 2개 이상 선택하세요"
                  : "Select at least two media to compare"
              }
            >
              {t("compareFloatingCompare")}
            </Button>
          ) : (
            <Button
              asChild
              variant="floatingSecondary"
              size="floating"
              className="flex-1 font-bold md:flex-none"
            >
              <Link href={compareHref}>{t("compareFloatingCompare")}</Link>
            </Button>
          )}
          <Button
            asChild
            variant="floatingPrimary"
            size="floating"
            className="flex-1 md:flex-none"
          >
            <Link href={quoteHref}>{t("compareQuoteCta")}</Link>
          </Button>
        </div>
      </div>
    </FloatingSelectionBar>
  );
}
