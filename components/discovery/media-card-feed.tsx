"use client";

import { useLocale } from "next-intl";
import { DiscoveryMediaCardHorizontal } from "@/components/discovery/media-card-horizontal";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { catalogItemToDisplayModel } from "@/lib/media-card-display";
import type { DiscoveryMediaCardCatalogProps } from "@/components/discovery/media-card-types";

type FeedProps = Pick<
  DiscoveryMediaCardCatalogProps,
  | "item"
  | "href"
  | "highlights"
  | "locationLine"
  | "priceLabel"
  | "inCompare"
  | "inCart"
  | "onToggleCompare"
  | "onToggleCart"
  | "plannerMode"
  | "isInPlan"
  | "onTogglePlan"
  | "rank"
  | "showPlanButton"
  | "plannerCardContext"
>;

export function DiscoveryMediaCardFeed(props: FeedProps) {
  const locale = useLocale();
  const {
    item,
    href,
    highlights = [],
    priceLabel = null,
    inCompare = false,
    onToggleCompare,
    plannerMode = false,
    isInPlan = false,
    onTogglePlan,
    rank,
    showPlanButton = true,
    plannerCardContext,
  } = props;

  const model = catalogItemToDisplayModel(item, {
    href,
    locale,
    priceLabel,
    highlights,
    ...plannerCardContext,
  });

  return (
    <DiscoveryMediaCardHorizontal
      model={model}
      rank={rank}
      plannerMode={plannerMode}
      isInPlan={isInPlan}
      onTogglePlan={onTogglePlan}
      showPlanButton={showPlanButton}
      inCompare={inCompare}
      onToggleCompare={onToggleCompare}
      planItem={planCartItemFromCatalog(item, "search")}
      addedFrom="search"
    />
  );
}
