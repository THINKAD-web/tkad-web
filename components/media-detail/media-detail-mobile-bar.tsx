"use client";

import { MediaInquiryDialog } from "@/components/media-detail/inquiry-dialog";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
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
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 border-t dark:border-white/10 border-gray-200 dark:bg-gray-900 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] lg:hidden",
        className,
      )}
      role="region"
      aria-label={isKo ? "빠른 문의" : "Quick inquiry"}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-bold tabular-nums dark:text-white text-gray-900">
            {formatCatalogPriceFieldWon(media.price, locale)}
          </p>
          <p className="truncate text-[10px] dark:text-white/45 text-gray-500">
            {periodLabel}
          </p>
        </div>
        <MediaInquiryDialog
          mediaId={media.id}
          mediaName={displayName}
          triggerLabel={isKo ? "문의하기 →" : "Inquire →"}
          className="shrink-0 border-0 bg-gradient-to-r from-violet-500 to-cyan-400 px-4 dark:text-white text-gray-900"
        />
        <MediaFavoriteButton
          mediaId={media.id}
          mediaName={media.name}
          mediaNameEn={media.nameEn}
          compact
          className="shrink-0"
        />
      </div>
    </div>
  );
}
