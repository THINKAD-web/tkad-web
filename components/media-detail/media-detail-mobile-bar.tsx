"use client";

import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { FloatingSelectionBar } from "@/components/floating-selection-bar";
import type { MediaItem } from "@/lib/media-data";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
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
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold tabular-nums text-gray-900 dark:text-white">
            {formatCatalogPriceFieldWon(media.price, locale)}
          </p>
          <p className="truncate text-[10px] text-gray-500 dark:text-white/45">
            {periodLabel}
          </p>
        </div>
        <MediaInquiryDialog
          mediaId={media.id}
          mediaName={displayName}
          triggerLabel={isKo ? "문의하기 →" : "Inquire →"}
          className="shrink-0 border-0 bg-gradient-to-r from-violet-500 to-cyan-400 px-4 text-gray-900 dark:text-white"
        />
        <MediaFavoriteButton
          mediaId={media.id}
          mediaName={media.name}
          mediaNameEn={media.nameEn}
          compact
          className="shrink-0"
        />
      </div>
    </FloatingSelectionBar>
  );
}
