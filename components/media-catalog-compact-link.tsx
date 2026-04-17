"use client";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Flame, MapPin } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { dedupeImageUrls, typeLabels, type MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS } from "@/components/media-catalog-shared";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  media: MediaItem;
  isKo: boolean;
  href: string;
  imagePreparingLabel: string;
  pricePeriodLabel: string;
  popularIds?: Set<string>;
  /** e.g. compare checkbox area left of thumbnail */
  leadingSlot?: ReactNode;
  /** e.g. compare checkbox overlay on thumbnail */
  thumbnailOverlay?: ReactNode;
  className?: string;
};

/**
 * 매체검색·비교 공통 컴팩트 행(상세 링크).
 */
export function MediaCatalogCompactLinkRow({
  media,
  isKo,
  href,
  imagePreparingLabel,
  pricePeriodLabel,
  popularIds,
  leadingSlot,
  thumbnailOverlay,
  className,
}: Props) {
  const primaryThumb =
    dedupeImageUrls(media.sampleImages ?? [])[0]?.trim() || null;

  return (
    <Link
      href={href}
      aria-label={isKo ? media.name : media.nameEn}
      className={cn(
        MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 hover:border-gold/30 hover:shadow-md transition-all duration-150",
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
        className="relative z-10 h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-28"
        bottomGradientClassName={null}
        placeholderSize="xs"
      >
        {thumbnailOverlay}
      </MediaCatalogThumbnail>
      <div className="relative z-0 flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden px-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Badge
            variant="secondary"
            className="shrink-0 bg-navy/6 px-1.5 py-0 text-[9px] font-semibold text-navy sm:text-[10px]"
          >
            {isKo
              ? (typeLabels[media.type]?.ko ?? media.type)
              : (typeLabels[media.type]?.en ?? media.type)}
          </Badge>
          {popularIds?.has(media.id) ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gold px-1.5 py-0 text-[8px] font-bold text-navy">
              <Flame className="h-2 w-2" />
              {isKo ? "인기" : "Hot"}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 min-w-0 break-words text-[13px] font-bold leading-snug text-navy sm:line-clamp-1 sm:text-sm">
          {isKo ? media.name : media.nameEn}
        </p>
        <p className="flex min-w-0 items-center gap-0.5 text-[10px] text-slate-500 sm:text-[11px]">
          <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400" />
          <span className="min-w-0 truncate">
            {formatMediaLocationShort(media, isKo)}
          </span>
        </p>
        <p className="text-[13px] font-extrabold tabular-nums text-amber-700 sm:text-sm">
          {formatMediaPriceWonWithSymbol(media.price)}
          <span className="text-[10px] font-normal text-muted-foreground">
            {" "}· {pricePeriodLabel}
          </span>
        </p>
      </div>
    </Link>
  );
}
