"use client";

import { useRef } from "react";
import { BtnBlock } from "@/components/brutalist";
import { FloatingSelectionBar } from "@/components/floating-selection-bar";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import type { MediaItem } from "@/lib/media-data";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Props {
  items: MediaItem[];
  locale: string;
  onClear: () => void;
}

/**
 * 매체검색 — 비교 카트가 있을 때 하단 고정 팝업.
 * ✓ N개 선택됨 · [선택해제] [비교하기] [견적받기]
 * 브루탈리스트: 상세 하단 CTA(검정·액센트)와 톤 맞춤.
 */
export default function CompareBar({ items, locale, onClear }: Props) {
  const t = useTranslations("media");
  const isKo = locale === "ko";
  /** 비우기 직후 exit 애니메이션에서도 직전 선택 목록 라벨을 유지 */
  const stashRef = useRef<MediaItem[]>([]);
  /* eslint-disable react-hooks/refs -- items=[]인 exit 프레임에서만 스냅샷 읽기 */
  if (items.length > 0) stashRef.current = items;
  const open = items.length > 0;
  const displayItems = open ? items : stashRef.current;
  /* eslint-enable react-hooks/refs */

  const ids = displayItems.map((m) => m.id).join(",");
  const compareHref = `/compare?ids=${displayItems.map((m) => m.id).join(",")}`;
  const one = displayItems[0];
  const onlyPo =
    displayItems.length === 1 && (one?.priceOptions?.length ?? 0) > 0
      ? "&po=0"
      : "";
  const quoteHref = `/quote?media=${ids}${onlyPo}`;

  const count = displayItems.length;
  const canCompare = count >= 2;

  const blockClass =
    "w-full min-h-12 min-w-0 justify-center px-2 text-[10px] sm:min-h-10 sm:px-3 sm:text-[11px]";

  return (
    <FloatingSelectionBar
      open={open}
      className="border-t-2 border-accent bg-hero-void/95 px-2 pb-2 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.5)] sm:px-4 sm:pb-3"
      ariaLabel={isKo ? "선택한 매체 작업" : "Selected media actions"}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div
          className="flex min-w-0 items-center gap-2 sm:gap-2.5"
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-accent bg-hero-void text-sm font-bold leading-none text-accent"
            aria-hidden
          >
            ✓
          </span>
          <span className="min-w-0 font-mono text-xs font-bold uppercase tabular-nums tracking-[0.12em] text-hero-fg/95 sm:text-sm">
            {t("compareFloatingSelected", { count })}
            <span className="sr-only">
              {" "}
              ({count}/{COMPARE_MAX_ITEMS})
            </span>
          </span>
        </div>

        <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-2">
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
            className={blockClass}
          >
            {t("compareQuoteCta")}
          </BtnBlock>
        </div>
      </div>
    </FloatingSelectionBar>
  );
}
