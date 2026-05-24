"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Flame } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { dedupeImageUrls, typeLabels, type MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  getCheapestMediaPriceOption,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import {
  MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
  MEDIA_CATALOG_THUMB_IMG_FILTER_CLASS,
} from "@/components/media-catalog-shared";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  media: MediaItem;
  isKo: boolean;
  href: string;
  imagePreparingLabel: string;
  popularIds?: Set<string>;
  /** e.g. compare checkbox area left of thumbnail */
  leadingSlot?: ReactNode;
  /** e.g. compare checkbox overlay on thumbnail */
  thumbnailOverlay?: ReactNode;
  className?: string;
};

/**
 * 매체검색·비교 공통 컴팩트 행(상세 링크).
 * 가격·기간은 `MediaCatalogGridCard`와 동일하게 `getCheapestMediaPriceOption` 기준.
 * Phase 3 Brutalist: 2px 보더, 사각, 모노 메타.
 */
export function MediaCatalogCompactLinkRow({
  media,
  isKo,
  href,
  imagePreparingLabel,
  popularIds,
  leadingSlot,
  thumbnailOverlay,
  className,
}: Props) {
  const tMedia = useTranslations("media");
  const cheapest = getCheapestMediaPriceOption(media);
  const priceWon = cheapest?.priceWon ?? media.price;
  const displayPeriod = cheapest?.period ?? media.pricePeriod;
  const showPricePeriod = !!cheapest;
  const periodLabel = tMedia(mediaPricePeriodTranslationKey(displayPeriod));

  const primaryThumb =
    dedupeImageUrls(media.sampleImages ?? [])[0]?.trim() || null;

  return (
    <Link
      href={href}
      aria-label={isKo ? media.name : (media.nameEn || media.name)}
      className={cn(
        MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
        "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      {leadingSlot ? (
        <div className="relative z-20 mr-1 flex h-full shrink-0 items-center justify-center">
          {leadingSlot}
        </div>
      ) : null}
      <MediaCatalogThumbnail
        media={media}
        primaryImageUrl={primaryThumb}
        placeholderLabel={imagePreparingLabel}
        className={cn(
          "relative z-10 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden border-2 border-border sm:h-24 sm:w-28",
          MEDIA_CATALOG_THUMB_IMG_FILTER_CLASS,
        )}
        bottomGradientClassName={null}
        placeholderSize="xs"
      >
        {thumbnailOverlay}
      </MediaCatalogThumbnail>
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col items-start justify-center gap-1 text-card-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-card-foreground">
            [ {isKo
              ? (typeLabels[media.type]?.ko ?? media.type)
              : (typeLabels[media.type]?.en ?? media.type)} ]
          </span>
          {popularIds?.has(media.id) ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 border-2 border-accent bg-accent px-1.5 py-[2px] text-[9px] font-bold tracking-[0.18em] text-accent-foreground">
              <Flame className="h-2 w-2" />
              {isKo ? "인기" : "Hot"}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 min-w-0 break-words text-[13px] font-bold leading-snug tracking-tight text-card-foreground sm:line-clamp-1 sm:text-sm">
          {isKo ? media.name : (media.nameEn || media.name)}
        </p>
        <p className="line-clamp-2 min-w-0 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:line-clamp-1">
          {`// `}
          {formatMediaLocationShort(media, isKo)}
        </p>
        <p className="min-w-0 shrink-0 break-words font-display text-[13px] font-bold tabular-nums leading-tight text-card-foreground sm:text-sm">
          {formatMediaPriceWonWithSymbol(priceWon)}
          {showPricePeriod ? (
            <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
              · {periodLabel}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
