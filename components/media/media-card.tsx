"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { MediaFeedCard } from "@/components/media/media-feed-card";
import { MediaCompactRow } from "@/components/media/media-compact-row";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import type { HomeCatalogMediaItem } from "@/types/media";
import type { MediaCardMode } from "@/types/media";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { cn } from "@/lib/utils";

export type MediaCardProps = {
  item: HomeCatalogMediaItem;
  mode?: MediaCardMode;
  href: string;
  isKo?: boolean;
  /** feed 모드 — 칩·하이라이트 */
  highlights?: string[];
  locationLine?: string | null;
  /** compact / card — 한 줄 메타 */
  metaLine?: string;
  priceLabel?: string | null;
  inCompare?: boolean;
  inCart?: boolean;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
  showPlanButton?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  /** true: 카드 본문 클릭 시 상세 대신 플랜 토글 */
  plannerMode?: boolean;
  rank?: number;
  recommendReason?: string;
  planAddedFrom?: "search" | "planner" | "ai_recommend" | "map";
  className?: string;
};

function MediaCardGrid({
  item,
  href,
  isKo = true,
  priceLabel,
  inCompare = false,
  inCart = false,
  onToggleCompare,
  onToggleCart,
  showPlanButton = true,
  isInPlan = false,
  onTogglePlan,
  plannerMode = false,
  rank,
  className,
}: MediaCardProps) {
  const thumb = catalogThumbnailImageProps(item.thumbnailUrl);

  const body = (
    <>
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {rank != null ? (
          <span className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-black text-white shadow-md">
            {rank}
          </span>
        ) : null}
        {thumb ? (
          <Image
            src={thumb.src}
            alt={item.name}
            fill
            className="rounded-t-2xl object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized={thumb.unoptimized}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
            {isKo ? "준비중" : "No image"}
          </div>
        )}
        <MediaThumbnailTrustOverlay item={item} isKo={isKo} variant="card" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-gray-900 dark:text-white">
          {item.name}
        </p>
        <p className="mt-1 line-clamp-1 min-h-4 text-xs text-gray-400 dark:text-white/40">
          {[item.region, item.type].filter(Boolean).join(" · ") || "\u00a0"}
        </p>
        <div className="mt-auto space-y-2 pt-2">
          {priceLabel ? (
            <div className="min-h-[2.25rem]">
              <p className="tkad-home-accent-text text-sm font-bold">{priceLabel}</p>
              <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
            </div>
          ) : (
            <div className="min-h-[2.25rem]" aria-hidden />
          )}
          {plannerMode && onTogglePlan ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePlan();
              }}
              className={cn(
                "flex h-9 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors",
                isInPlan
                  ? "border border-violet-400/50 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                  : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
              )}
            >
              {isInPlan ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {isKo ? "담김 ✓" : "Added ✓"}
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {isKo ? "+ 플랜 담기" : "+ Add to plan"}
                </>
              )}
            </button>
          ) : showPlanButton ? (
            <div className="flex h-8 items-stretch gap-1">
              <PlanCartAddButton
                item={planCartItemFromCatalog(item, "search")}
                addedFrom="search"
                compact
                gridInline
                className="min-w-0 flex-1 !h-8 !px-1 !text-[10px]"
              />
              {onToggleCompare ? (
                <MediaCompareSelectButton
                  selected={inCompare}
                  onToggle={onToggleCompare}
                  gridInline
                  className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
                />
              ) : null}
              {onToggleCart ? (
                <MediaCartAddButton
                  inCart={inCart}
                  onToggle={onToggleCart}
                  gridInline
                  className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  const shellClass = cn(
    "flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5",
    className,
  );

  if (plannerMode && onTogglePlan) {
    return (
      <div className={shellClass}>
        <button
          type="button"
          onClick={onTogglePlan}
          className="flex h-full w-full flex-col text-left"
        >
          {body}
        </button>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        shellClass,
        "transition-shadow hover:shadow-md active:scale-[0.99]",
      )}
    >
      {body}
    </Link>
  );
}

/** 표준 매체 카드 — /media·/planner·/recommend·/map 공통 */
export function MediaCard(props: MediaCardProps) {
  const {
    mode = "feed",
    recommendReason,
    className,
    isKo = true,
    plannerMode = false,
    onTogglePlan,
    isInPlan = false,
    rank,
    showPlanButton = true,
  } = props;

  let card: ReactNode;

  if (mode === "compact") {
    card = (
      <MediaCompactRow
        item={props.item}
        href={props.href}
        metaLine={props.metaLine ?? ""}
        inCompare={props.inCompare ?? false}
        inCart={props.inCart ?? false}
        onToggleCompare={props.onToggleCompare ?? (() => {})}
        onToggleCart={props.onToggleCart ?? (() => {})}
        plannerMode={plannerMode}
        isInPlan={isInPlan}
        onTogglePlan={onTogglePlan}
        rank={rank}
      />
    );
  } else if (mode === "card") {
    card = <MediaCardGrid {...props} isKo={isKo} />;
  } else {
    card = (
      <MediaFeedCard
        item={props.item}
        href={props.href}
        highlights={props.highlights ?? []}
        locationLine={props.locationLine ?? null}
        isKo={isKo}
        inCompare={props.inCompare ?? false}
        inCart={props.inCart ?? false}
        onToggleCompare={props.onToggleCompare ?? (() => {})}
        onToggleCart={props.onToggleCart ?? (() => {})}
        plannerMode={plannerMode}
        isInPlan={isInPlan}
        onTogglePlan={onTogglePlan}
        rank={rank}
        showPlanButton={showPlanButton}
      />
    );
  }

  if (!recommendReason?.trim()) {
    return (
      <div className={cn(mode === "card" && "h-full min-h-0", className)}>{card}</div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {card}
      <p className="px-3 pb-2 text-xs text-violet-500 dark:text-violet-400">
        {recommendReason}
      </p>
    </div>
  );
}
