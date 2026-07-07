"use client";

import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DiscoveryMediaCardFeed } from "@/components/discovery/media-card-feed";
import {
  DiscoveryMediaCardCompactRow,
  DiscoveryMediaCardCatalogTile,
  DiscoveryMediaCardCompactGrid,
  DiscoveryMediaCardMapTile,
} from "@/components/discovery/media-card-compact";
import {
  isDiscoveryMapCardProps,
  type DiscoveryMediaCardProps,
  type MediaCardCompactLayout,
  type MediaCardVariant,
} from "@/components/discovery/media-card-types";

export type {
  DiscoveryMediaCardProps,
  DiscoveryMediaCardCatalogProps,
  DiscoveryMediaCardMapProps,
  DiscoveryMediaCardSharedProps,
  MediaCardVariant,
  MediaCardCompactLayout,
} from "@/components/discovery/media-card-types";

/**
 * 발견하기 카테고리 공용 매체 카드.
 *
 * - `variant="feed"` — 큰 썸네일 쇼핑몰형 (`/media` 기본)
 * - `variant="compact"` — `compactLayout` 으로 분기:
 *   - `row` — 고밀도 리스트 행 (`/media` 컴팩트 뷰)
 *   - `grid` — 2~4열 정사각 그리드 (홈·추천)
 *   - `map-tile` — 세로 스택 타일 (`/media/map` 목록, `/media` 카드형)
 */
export const DiscoveryMediaCard = forwardRef<
  HTMLLIElement,
  DiscoveryMediaCardProps
>(function DiscoveryMediaCard(props, ref) {
  const {
    className,
    recommendReason,
    recommendReasonInside = false,
    cardFooter,
    isKo = true,
    plannerMode = false,
    onTogglePlan,
    isInPlan = false,
    rank,
    showPlanButton = true,
    inCompare = false,
    inCart = false,
    onToggleCompare,
    onToggleCart,
  } = props;

  if (isDiscoveryMapCardProps(props)) {
    const mapTile = (
      <DiscoveryMediaCardMapTile
        ref={ref}
        {...props}
        isKo={isKo}
        inCompare={inCompare}
        inCart={inCart}
        onToggleCompare={onToggleCompare}
        onToggleCart={onToggleCart}
      />
    );
    if (!recommendReason?.trim()) {
      return mapTile;
    }
    return (
      <li className={cn("list-none", className)}>
        {mapTile}
        <p className="tkad-type-meta px-3 pb-2 text-tkad-accent">
          {recommendReason}
        </p>
      </li>
    );
  }

  let card: ReactNode;

  const variant: MediaCardVariant = props.variant ?? "feed";
  const compactLayout: MediaCardCompactLayout =
    props.compactLayout ?? (variant === "compact" ? "row" : "grid");

  if (variant === "feed") {
    card = (
      <DiscoveryMediaCardFeed
        item={props.item}
        href={props.href}
        highlights={props.highlights ?? []}
        locationLine={props.locationLine ?? null}
        priceLabel={props.priceLabel}
        isKo={isKo}
        inCompare={inCompare}
        inCart={inCart}
        onToggleCompare={onToggleCompare}
        onToggleCart={onToggleCart}
        plannerMode={plannerMode}
        isInPlan={isInPlan}
        onTogglePlan={onTogglePlan}
        rank={rank}
        showPlanButton={showPlanButton}
      />
    );
  } else if (compactLayout === "map-tile") {
    card = (
      <DiscoveryMediaCardCatalogTile
        item={props.item}
        href={props.href}
        isKo={isKo}
        priceLabel={props.priceLabel}
        inCompare={inCompare}
        onToggleCompare={onToggleCompare}
        plannerMode={plannerMode}
        isInPlan={isInPlan}
        onTogglePlan={onTogglePlan}
      />
    );
  } else if (compactLayout === "grid") {
    card = (
      <DiscoveryMediaCardCompactGrid
        item={props.item}
        href={props.href}
        isKo={isKo}
        priceLabel={props.priceLabel}
        inCompare={inCompare}
        inCart={inCart}
        onToggleCompare={onToggleCompare}
        onToggleCart={onToggleCart}
        showPlanButton={showPlanButton}
        plannerMode={plannerMode}
        isInPlan={isInPlan}
        onTogglePlan={onTogglePlan}
        rank={rank}
        recommendReason={
          recommendReasonInside ? recommendReason : undefined
        }
        cardFooter={cardFooter}
      />
    );
  } else {
    card = (
      <DiscoveryMediaCardCompactRow
        item={props.item}
        href={props.href}
        metaLine={props.metaLine ?? ""}
        isKo={isKo}
        inCompare={inCompare}
        inCart={inCart}
        onToggleCompare={onToggleCompare}
        onToggleCart={onToggleCart}
        plannerMode={plannerMode}
        isInPlan={isInPlan}
        onTogglePlan={onTogglePlan}
        rank={rank}
      />
    );
  }

  const isStackedTile =
    props.variant === "compact" &&
    (props.compactLayout === "grid" || props.compactLayout === "map-tile");

  if (!recommendReason?.trim() || recommendReasonInside) {
    return (
      <div className={cn(isStackedTile && "h-full min-h-0", className)}>{card}</div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {card}
      <p className="tkad-type-meta line-clamp-2 px-3 pb-2 text-tkad-accent">
        {recommendReason}
      </p>
    </div>
  );
});
