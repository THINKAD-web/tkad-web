"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { cn } from "@/lib/utils";

type Props = {
  item: HomeCatalogMediaItem;
  href: string;
  metaLine: string;
  inCompare: boolean;
  inCart: boolean;
  onToggleCompare: () => void;
  onToggleCart: () => void;
  plannerMode?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  rank?: number;
};

/** 매체 검색 — 컴팩트 뷰 (한 화면에 더 많이 보이도록 고밀도 행) */
export function MediaCompactRow({
  item,
  href,
  metaLine,
  inCompare,
  inCart,
  onToggleCompare,
  onToggleCart,
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  rank,
}: Props) {
  const rowLink = (
    <>
      <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {rank != null ? (
          <span className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
            {rank}
          </span>
        ) : null}
        {(() => {
          const thumb = catalogThumbnailImageProps(item.thumbnailUrl);
          return thumb ? (
            <Image
              src={thumb.src}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
              unoptimized={thumb.unoptimized}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] text-gray-300 dark:text-white/20">
              —
            </div>
          );
        })()}
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
          {item.name}
        </p>
        {metaLine ? (
          <p className="truncate text-[10px] text-gray-500 dark:text-white/45">
            {metaLine}
            <span className="mx-1 text-gray-300 dark:text-white/25">·</span>
            <MediaPriceExclNote inline className="text-[9px]" />
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-h-[3rem] items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors",
        "hover:bg-gray-50 active:bg-gray-100/80 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]",
      )}
    >
      {plannerMode && onTogglePlan ? (
        <button
          type="button"
          onClick={onTogglePlan}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          {rowLink}
        </button>
      ) : (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-2.5">
          {rowLink}
        </Link>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        {plannerMode && onTogglePlan ? (
          <button
            type="button"
            onClick={onTogglePlan}
            className={cn(
              "inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[9px] font-semibold",
              isInPlan
                ? "bg-violet-500/20 text-violet-600 dark:text-violet-300"
                : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
            )}
          >
            {isInPlan ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          </button>
        ) : (
          <>
            <PlanCartAddButton
              item={planCartItemFromCatalog(item, "search")}
              addedFrom="search"
              compact
              className="!h-[1.125rem] !px-1.5 !text-[8px]"
            />
            <MediaCompareSelectButton
              selected={inCompare}
              onToggle={onToggleCompare}
              className="!h-[1.125rem] !px-1.5 !text-[8px]"
            />
            <MediaCartAddButton
              inCart={inCart}
              onToggle={onToggleCart}
              className="!h-[1.125rem] !px-1.5 !text-[8px]"
            />
          </>
        )}
      </div>
    </div>
  );
}
