"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import {
  mapMediaItemToHomeCatalog,
  catalogThumbnailImageProps,
} from "@/lib/media-catalog-map";
import type { MediaItem } from "@/lib/media-data";
import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";
import { typeLabels } from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  selected: boolean;
  priceMan: number;
  pricePeriod?: MediaItem["pricePeriod"];
  onToggle: () => void;
};

/** `/media` 카드 뷰와 동일 레이아웃 + 견적 선택 */
export function QuoteMediaSelectCard({
  media,
  isKo,
  selected,
  priceMan,
  pricePeriod,
  onToggle,
}: Props) {
  const catalog = mapMediaItemToHomeCatalog(media);
  const thumb = catalogThumbnailImageProps(catalog.thumbnailUrl);
  const typeLabel =
    typeLabels[media.type]?.[isKo ? "ko" : "en"] ?? media.type;
  const metaLine = [catalog.region, typeLabel].filter(Boolean).join(" · ");
  const locale = isKo ? "ko-KR" : "en-US";
  const priceLabel =
    priceMan > 0
      ? formatMediaPriceWithPeriodSuffix(
          priceMan * 10_000,
          pricePeriod ?? "month",
          locale,
        )
      : null;
  const instant = isInstantBookingEligible({
    instantBookingEnabled: media.instantBookingEnabled ?? false,
    availability: media.availability,
    catalogSource: media.catalogSource,
  }).eligible;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full overflow-hidden rounded-2xl border text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        selected
          ? "border-violet-400/60 bg-violet-50/80 ring-2 ring-violet-400/30 dark:border-violet-400/50 dark:bg-violet-500/10"
          : "border-gray-100 bg-white dark:border-white/10 dark:bg-white/5",
      )}
      aria-pressed={selected}
      aria-label={isKo ? `${media.name} 선택` : `Select ${media.nameEn || media.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {thumb ? (
          <Image
            src={thumb.src}
            alt={media.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized={thumb.unoptimized}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
            {isKo ? "준비중" : "No image"}
          </div>
        )}
        <MediaThumbnailTrustOverlay
          item={{
            isVerified: media.isVerified,
            isInstantBooking: instant,
          }}
          isKo={isKo}
          variant="card"
        />
        <span
          className={cn(
            "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-sm",
            selected
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-white/80 bg-black/40 text-white backdrop-blur-sm",
          )}
          aria-hidden
        >
          {selected ? <Check className="h-4 w-4" /> : null}
        </span>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
          {isKo ? media.name : media.nameEn || media.name}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{metaLine}</p>
        {priceLabel ? (
          <div className="mt-2">
            <p className="text-sm font-bold tabular-nums tkad-home-accent-text">
              {priceLabel}
            </p>
            <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
          </div>
        ) : null}
      </div>
    </button>
  );
}
