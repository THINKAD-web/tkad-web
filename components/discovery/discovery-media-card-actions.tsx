"use client";

import type { MouseEvent } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import { cn } from "@/lib/utils";

export type DiscoveryMediaCardActionsProps = {
  mediaId: string;
  planItem: Omit<PlanCartItem, "addedAt">;
  detailHref: string;
  isKo?: boolean;
  inCompare?: boolean;
  onToggleCompare?: () => void;
  addedFrom?: PlanCartAddedFrom;
  size?: "compact" | "comfortable";
  /** `preview` — 지도 마커 미리보기(dock): 상세·담기·문의만 */
  /** `map-tile` — 지도 사이드 패널 타일: 담기+·비교+만 */
  /** `grid-cell` — /media 2열 카드: 상세·문의 짧은 라벨 + 담기·비교 */
  layout?: "full" | "preview" | "dense" | "map-tile" | "grid-cell";
  className?: string;
  /** 클릭 가능한 카드/타일 안에서 버블링 방지 */
  stopPropagation?: boolean;
};

function guardCardClick(
  stopPropagation: boolean,
  handler?: (e: MouseEvent) => void,
) {
  return (e: MouseEvent) => {
    if (stopPropagation) {
      e.stopPropagation();
      e.preventDefault();
    }
    handler?.(e);
  };
}

/**
 * `/media`·`/media/map` 결과 카드 공용 액션 — 구성·라벨·순서 동일.
 * 1행: 상세 보기 · 문의하기 / 2행: 비교+ · 담기+ (플랜 카트 = 담기+ 단일)
 */
export function DiscoveryMediaCardActions({
  mediaId,
  planItem,
  detailHref,
  isKo = true,
  inCompare = false,
  onToggleCompare,
  addedFrom = "search",
  size = "compact",
  layout = "full",
  className,
  stopPropagation = false,
}: DiscoveryMediaCardActionsProps) {
  const contactHref = `/contact?media=${encodeURIComponent(mediaId)}`;
  const btnClass =
    size === "comfortable"
      ? "min-w-0 flex-1 !h-9 !rounded-lg !px-2 !text-xs"
      : "min-w-0 flex-1 !h-8 !px-1 !text-[10px]";

  const primaryLinkClass =
    "inline-flex h-9 min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-[11px] font-semibold leading-none text-gray-800 transition-colors hover:bg-gray-50 dark:border-white/14 dark:bg-white/8 dark:text-white dark:hover:bg-white/12";

  const contactLinkClass =
    "tkad-media-map-sheet-cta inline-flex h-9 min-h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-violet-700/30 bg-violet-700 px-2 text-[11px] font-semibold leading-none text-white shadow-sm shadow-violet-900/20 transition-colors hover:bg-violet-800";

  if (layout === "preview") {
    return (
      <div className={cn("grid min-w-0 grid-cols-3 gap-1.5", className)}>
        <Link
          href={detailHref}
          onClick={guardCardClick(stopPropagation)}
          className={cn(primaryLinkClass, "col-span-1")}
        >
          <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{isKo ? "상세 보기" : "Details"}</span>
        </Link>
        <MediaCartAddButton
          item={planItem}
          addedFrom={addedFrom}
          gridInline
          className="!col-span-1 !h-9 !min-h-9 !min-w-0 !rounded-lg !px-1 !text-[11px]"
        />
        <Link
          href={contactHref}
          onClick={guardCardClick(stopPropagation)}
          className={cn(contactLinkClass, "col-span-1")}
        >
          <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">{isKo ? "문의하기" : "Contact"}</span>
        </Link>
      </div>
    );
  }

  if (layout === "grid-cell") {
    const shortBtn =
      "inline-flex h-8 min-h-8 min-w-0 flex-1 items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold leading-none whitespace-nowrap";
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="grid grid-cols-2 gap-1">
          <Link
            href={detailHref}
            onClick={guardCardClick(stopPropagation)}
            className={cn(shortBtn, primaryLinkClass, "!h-8")}
          >
            <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
            {isKo ? "상세" : "Details"}
          </Link>
          <Link
            href={contactHref}
            onClick={guardCardClick(stopPropagation)}
            className={cn(shortBtn, contactLinkClass, "!h-8")}
          >
            <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            {isKo ? "문의" : "Contact"}
          </Link>
        </div>
        <div className="flex items-stretch gap-1">
          {onToggleCompare ? (
            <MediaCompareSelectButton
              selected={inCompare}
              onToggle={onToggleCompare}
              gridInline
              className="!h-7 !min-w-0 !flex-1 !rounded-lg !px-1.5 !text-[10px]"
            />
          ) : null}
          <MediaCartAddButton
            item={planItem}
            addedFrom={addedFrom}
            gridInline
            className="!h-7 !min-w-0 !flex-1 !rounded-lg !px-1.5 !text-[10px]"
          />
        </div>
      </div>
    );
  }

  if (layout === "map-tile") {
    return (
      <div className={cn("mt-2 flex items-stretch gap-1.5", className)}>
        <MediaCartAddButton
          item={planItem}
          addedFrom={addedFrom}
          gridInline
          className="!h-8 !min-w-0 !flex-1 !rounded-lg !px-2 !text-[11px]"
        />
        {onToggleCompare ? (
          <MediaCompareSelectButton
            selected={inCompare}
            onToggle={onToggleCompare}
            gridInline
            className="!h-8 !min-w-0 !flex-1 !rounded-lg !px-2 !text-[11px]"
          />
        ) : null}
      </div>
    );
  }

  if (layout === "dense") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href={detailHref}
            onClick={guardCardClick(stopPropagation)}
            className={cn(primaryLinkClass, "!h-8 !min-h-8 !text-[11px]")}
          >
            <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{isKo ? "상세" : "Details"}</span>
          </Link>
          <Link
            href={contactHref}
            onClick={guardCardClick(stopPropagation)}
            className={cn(contactLinkClass, "!h-8 !min-h-8 !text-[11px]")}
          >
            <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{isKo ? "문의" : "Contact"}</span>
          </Link>
        </div>
        <div className="flex items-stretch justify-end gap-1">
          {onToggleCompare ? (
            <MediaCompareSelectButton
              selected={inCompare}
              onToggle={onToggleCompare}
              gridInline
              className="!h-7 !min-w-0 !flex-1 !rounded-lg !px-1.5 !text-[10px]"
            />
          ) : null}
          <MediaCartAddButton
            item={planItem}
            addedFrom={addedFrom}
            gridInline
            className="!h-7 !min-w-0 !flex-1 !rounded-lg !px-1.5 !text-[10px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-1.5">
        <Link
          href={detailHref}
          onClick={guardCardClick(stopPropagation)}
          className={primaryLinkClass}
        >
          <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
          {isKo ? "상세 보기" : "View details"}
        </Link>
        <Link
          href={contactHref}
          onClick={guardCardClick(stopPropagation)}
          className={contactLinkClass}
        >
          <MessageCircle className="h-3 w-3 shrink-0" aria-hidden />
          {isKo ? "문의하기" : "Contact"}
        </Link>
      </div>
      <div className="flex items-stretch gap-1.5">
        {onToggleCompare ? (
          <MediaCompareSelectButton
            selected={inCompare}
            onToggle={onToggleCompare}
            gridInline
            className={cn(btnClass, size === "comfortable" && "!rounded-lg")}
          />
        ) : null}
        <MediaCartAddButton
          item={planItem}
          addedFrom={addedFrom}
          gridInline
          className={cn(btnClass, size === "comfortable" && "!rounded-lg")}
        />
      </div>
    </div>
  );
}
