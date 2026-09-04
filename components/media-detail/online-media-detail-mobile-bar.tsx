"use client";

import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_VIOLET,
  STICKY_ACTION_BAR_ROW,
  StickyActionBar,
} from "@/components/sticky-action-bar";
import type { MediaItem } from "@/lib/media-data";
import { mediaPriceOnInquiryLabel } from "@/lib/media-price-format";
import {
  onlinePricingLabel,
} from "@/lib/pricing/online-performance-estimate";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  className?: string;
};

export function OnlineMediaDetailMobileBar({ media, isKo, className }: Props) {
  const spec = media.onlineSpec;
  const calculable = hasOnlinePricingSpec(media);
  const headline =
    calculable && spec
      ? onlinePricingLabel(spec)
      : mediaPriceOnInquiryLabel(isKo ? "ko" : "en");

  return (
    <StickyActionBar
      open
      layout="dock"
      variant="neon"
      compact
      aboveMobileChrome
      respectFooter
      ariaLabel={isKo ? "빠른 문의" : "Quick contact"}
      className={cn("lg:hidden", className)}
    >
      <div className={STICKY_ACTION_BAR_ROW}>
        <div className="min-w-0 flex-1 truncate">
          <p className="truncate font-sans text-[length:var(--qp-text-body)] font-bold leading-tight text-[color:var(--qp-accent)]">
            {headline}
          </p>
          {calculable ? (
            <p className="truncate text-[length:var(--qp-text-meta)] text-gray-600 dark:text-white/65">
              {isKo ? "참고 단가 · /월" : "Reference rate · /mo"}
            </p>
          ) : null}
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
        <MediaQuoteCtaButton
          media={media}
          variant="sticky"
          className={cn(
            STICKY_ACTION_BAR_BTN,
            STICKY_ACTION_BAR_BTN_VIOLET,
            "!h-8 !w-auto shrink-0 !rounded-lg !border-0 !px-2.5 !tkad-type-caption !font-semibold !shadow-sm !tracking-normal",
          )}
        />
      </div>
    </StickyActionBar>
  );
}
