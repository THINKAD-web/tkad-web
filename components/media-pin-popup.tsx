"use client";

import { useTranslations } from "next-intl";
import { MediaCard } from "@/components/media/media-card";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import type { MediaItem } from "@/types/media";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWithPeriodSuffix,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { cn } from "@/lib/utils";

export function MediaPinPopup({
  media,
  isKo,
  isSelected,
  onToggleSelect,
}: {
  media: MediaItem | null;
  isKo: boolean;
  isSelected?: boolean;
  onToggleSelect?: (mediaId: string) => void;
}) {
  if (!media) return null;

  const catalogItem = mapMediaItemToHomeCatalog(media);
  const href = mediaItemDetailPath(media);
  const priceLabel = media.price
    ? formatMediaPriceWithPeriodSuffix(
        media.price,
        normalizeMediaPricePeriod(media.pricePeriod),
        isKo ? "ko-KR" : "en-US",
      )
    : null;
  const metaLine = [formatMediaLocationShort(media, isKo), priceLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div
        className={cn(
          "pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-950",
          onToggleSelect ? "pb-2" : "",
        )}
      >
        <MediaCard
          mode="compact"
          item={catalogItem}
          href={href}
          metaLine={metaLine}
          isKo={isKo}
          inCompare={Boolean(isSelected)}
          inCart={false}
          onToggleCompare={() => onToggleSelect?.(media.id)}
          onToggleCart={() => {}}
          showPlanButton={false}
        />
      </div>
    </div>
  );
}
