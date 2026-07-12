"use client";

import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
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
import {
  formatCatalogPriceFieldWon,
  formatPricePeriodShortLabel,
  resolveMediaDisplayPrice,
} from "@/lib/media-price-format";
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
  displayName,
  className,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const displayPrice = resolveMediaDisplayPrice(media);
  const multiPriceOptions = (media.priceOptions?.length ?? 0) >= 2;
  const displayPeriodLabel = formatPricePeriodShortLabel(
    displayPrice.period,
    isKo ? "ko" : "en",
  );

  return (
    <StickyActionBar
      open
      layout="dock"
      variant="neon"
      compact
      aboveMobileChrome
      respectFooter
      ariaLabel={isKo ? "빠른 문의" : "Quick inquiry"}
      className={cn("lg:hidden", className)}
    >
      <div className={STICKY_ACTION_BAR_ROW}>
        <div className="min-w-0 flex-1 truncate">
          <p className="truncate font-display text-[11px] font-bold leading-tight tabular-nums text-gray-900 dark:text-white">
            <span className="whitespace-nowrap">
              {formatCatalogPriceFieldWon(displayPrice.priceWon, locale)}
              {multiPriceOptions && isKo ? "~" : null}
            </span>
            <span className="ml-1 font-medium text-gray-500 dark:text-white/45">
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
          className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE, "!h-8 shrink-0")}
        />
        <MediaQuoteCtaButton
          media={media}
          variant="sticky"
          className={cn(
            STICKY_ACTION_BAR_BTN,
            STICKY_ACTION_BAR_BTN_VIOLET,
            "!h-8 !w-auto shrink-0 !rounded-lg !border-0 !px-2.5 !text-[11px] !font-semibold !shadow-sm !tracking-normal",
          )}
        />
        <MediaInquiryDialog
          mediaId={media.id}
          mediaName={displayName}
          triggerLabel={isKo ? "문의" : "Ask"}
          compact
          className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE, "shrink-0")}
        />
      </div>
    </StickyActionBar>
  );
}
