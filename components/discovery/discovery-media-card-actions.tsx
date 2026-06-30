"use client";

import type { MouseEvent } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
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
 * 1행: 상세 보기 · 문의하기 / 2행: 플랜+ · 비교+ · 담기+
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
  className,
  stopPropagation = false,
}: DiscoveryMediaCardActionsProps) {
  const contactHref = `/contact?media=${encodeURIComponent(mediaId)}`;
  const btnClass =
    size === "comfortable"
      ? "min-w-0 flex-1 !h-9 !rounded-lg !px-2 !text-xs"
      : "min-w-0 flex-1 !h-8 !px-1 !text-[10px]";

  const primaryLinkClass =
    "inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:border-white/14 dark:bg-white/8 dark:text-white dark:hover:bg-white/12";

  const contactLinkClass =
    "tkad-media-map-sheet-cta inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-violet-700/30 bg-violet-700 px-2 text-xs font-semibold text-white shadow-sm shadow-violet-900/20 transition-colors hover:bg-violet-800";

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
        <PlanCartAddButton
          item={planItem}
          addedFrom={addedFrom}
          compact
          gridInline
          className={cn(btnClass, size === "comfortable" && "!rounded-lg")}
        />
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
