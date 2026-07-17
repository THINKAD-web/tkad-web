"use client";

import { useMemo } from "react";
import { Link } from "@/i18n/navigation";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_VIOLET,
  STICKY_ACTION_BAR_ROW,
  StickyActionBar,
} from "@/components/sticky-action-bar";
import type { MediaItem } from "@/lib/media-data";
import { findCheapestPriceOptionIndex } from "@/lib/compare-quote";
import {
  formatCatalogPriceFieldWon,
  formatPricePeriodShortLabel,
  resolveMediaDisplayPrice,
} from "@/lib/media-price-format";
import { buildMediaDetailQuoteHref } from "@/lib/media-detail-quantity";
import { inferQuoteCampaignPeriodFromMedia } from "@/lib/quote-wizard-pricing";
import { rememberQuoteEntryPriceOption } from "@/lib/quote-wizard-entry";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  displayName: string;
  periodLabel: string;
  className?: string;
};

export function MediaDetailMobileBar({
  media,
  isKo,
  className,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const displayPrice = resolveMediaDisplayPrice(media);
  const multiPriceOptions = (media.priceOptions?.length ?? 0) >= 2;
  const displayPeriodLabel = formatPricePeriodShortLabel(
    displayPrice.period,
    isKo ? "ko" : "en",
  );

  const defaultOptIdx = useMemo(
    () => findCheapestPriceOptionIndex(media),
    [media],
  );

  const quoteHref = useMemo(
    () =>
      buildMediaDetailQuoteHref(media, {
        priceOptionIndex: defaultOptIdx,
        period: inferQuoteCampaignPeriodFromMedia(media, defaultOptIdx),
      }),
    [media, defaultOptIdx],
  );

  return (
    <StickyActionBar
      open
      layout="dock"
      variant="neon"
      compact
      aboveMobileChrome
      respectFooter
      ariaLabel={isKo ? "빠른 견적" : "Quick quote"}
      className={cn("lg:hidden", className)}
    >
      <div className={STICKY_ACTION_BAR_ROW}>
        <div className="min-w-0 flex-1 truncate">
          <p className="truncate font-display text-[length:var(--qp-text-body)] font-bold leading-tight tabular-nums text-[color:var(--qp-accent)]">
            <span className="whitespace-nowrap">
              {formatCatalogPriceFieldWon(displayPrice.priceWon, locale)}
              {multiPriceOptions && isKo ? "~" : null}
            </span>
            <span className="ml-1 text-[length:var(--qp-text-meta)] font-medium text-gray-600 dark:text-white/65">
              / {displayPeriodLabel}
            </span>
          </p>
        </div>

        <MediaFavoriteButton
          mediaId={media.id}
          mediaName={media.name}
          mediaNameEn={media.nameEn}
          compact
          className="!h-8 shrink-0"
        />
        <PlanCartAddButton
          item={planCartItemFromMediaItem(media, "search")}
          addedFrom="search"
          compact
          mediaDetailLabel
          className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE, "!h-8 shrink-0")}
        />
        <Link
          href={quoteHref}
          onClick={() => rememberQuoteEntryPriceOption(media.id, defaultOptIdx)}
          className={cn(
            STICKY_ACTION_BAR_BTN,
            STICKY_ACTION_BAR_BTN_VIOLET,
            "!h-8 !w-auto shrink-0 !rounded-lg !border-0 !px-2.5 !text-[11px] !font-semibold !shadow-sm !tracking-normal",
          )}
        >
          {isKo ? "견적 받기" : "Get quote"}
        </Link>
      </div>
    </StickyActionBar>
  );
}
