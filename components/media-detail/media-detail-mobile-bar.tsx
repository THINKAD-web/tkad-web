"use client";

import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromMediaItem } from "@/lib/plan-cart-item-builders";
import { FloatingSelectionBar } from "@/components/floating-selection-bar";
import type { MediaItem } from "@/lib/media-data";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
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
  periodLabel,
  className,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";

  return (
    <FloatingSelectionBar
      open
      variant="neon"
      compact
      aboveMobileChrome
      ariaLabel={isKo ? "빠른 문의" : "Quick inquiry"}
      className={cn("lg:hidden", className)}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {/* 가격: ₩금액 1줄 + 기간 인라인, 보조문구는 아래 캡션 */}
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold leading-tight tabular-nums text-gray-900 dark:text-white">
            <span className="whitespace-nowrap">
              {formatCatalogPriceFieldWon(media.price, locale)}
            </span>
            <span className="ml-1 text-[11px] font-medium text-gray-500 dark:text-white/45">
              / {periodLabel}
            </span>
          </p>
          <MediaPriceExclNote
            isKo={isKo}
            className="mt-0.5 text-[10px] leading-tight text-gray-400 dark:text-white/40"
          />
        </div>

        {/* 보조 액션: 아이콘으로 축소 */}
        <MediaFavoriteButton
          mediaId={media.id}
          mediaName={media.name}
          mediaNameEn={media.nameEn}
          compact
          className="shrink-0"
        />
        <PlanCartAddButton
          item={planCartItemFromMediaItem(media, "search")}
          addedFrom="search"
          compact
          className="shrink-0"
        />

        {/* 주 CTA */}
        <MediaInquiryDialog
          mediaId={media.id}
          mediaName={displayName}
          triggerLabel={isKo ? "문의하기" : "Inquire"}
          className="shrink-0 border-0 bg-gradient-to-r from-violet-500 to-cyan-400 px-5 font-semibold text-gray-900 dark:text-white"
        />
      </div>
    </FloatingSelectionBar>
  );
}
