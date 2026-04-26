"use client";

import { Link } from "@/i18n/navigation";
import { Flame } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { dedupeImageUrls, typeLabels, type MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";
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
 * Phase 3 Brutalist: 2px 검정 보더, 사각, 모노 메타.
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
      aria-label={isKo ? media.name : (media.nameEn || media.name)}
      className={cn(
        MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bx-accent",
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
        className="relative z-10 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden border-2 border-bx-black sm:h-24 sm:w-28"
        bottomGradientClassName={null}
        placeholderSize="xs"
      >
        {thumbnailOverlay}
      </MediaCatalogThumbnail>
      <div className="relative z-0 flex min-w-0 flex-1 flex-col items-start justify-center gap-1 overflow-hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bx-gray-dim">
          <span className="text-bx-black">
            [ {isKo
              ? (typeLabels[media.type]?.ko ?? media.type)
              : (typeLabels[media.type]?.en ?? media.type)} ]
          </span>
          {popularIds?.has(media.id) ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 border-2 border-bx-accent bg-bx-accent px-1.5 py-[2px] text-[9px] font-bold tracking-[0.18em] text-bx-white">
              <Flame className="h-2 w-2" />
              {isKo ? "인기" : "Hot"}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-2 min-w-0 break-words text-[13px] font-bold leading-snug tracking-tight text-bx-black sm:line-clamp-1 sm:text-sm">
          {isKo ? media.name : (media.nameEn || media.name)}
        </p>
        <p className="line-clamp-2 min-w-0 font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim sm:line-clamp-1">
          {`// `}
          {formatMediaLocationShort(media, isKo)}
        </p>
        <p className="min-w-0 break-words font-mono text-[13px] font-bold tabular-nums leading-tight text-bx-black sm:text-sm">
          {formatMediaPriceWonWithSymbol(media.price)}
          <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-bx-gray-dim">
            · {pricePeriodLabel}
          </span>
        </p>
      </div>
    </Link>
  );
}
