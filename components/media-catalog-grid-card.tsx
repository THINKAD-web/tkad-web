"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MapPin, BadgeCheck, Flame, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";

export const mediaCatalogGridCardShellClass =
  "relative min-w-0 overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5";

type Common = {
  media: MediaItem;
  isKo: boolean;
  imagePreparingLabel: string;
  popularIds?: ReadonlySet<string>;
  priceMan?: number;
  showPricePeriod?: boolean;
  className?: string;
  /** Optional action buttons or extra content below the price */
  footerSlot?: ReactNode;
};

export type MediaCatalogGridCardProps =
  | (Common & {
      variant: "link";
      topLeftSlot?: ReactNode;
    })
  | (Common & {
      variant: "selectable";
      selected: boolean;
      onToggleSelected: () => void;
      selectionAriaLabel: string;
    });

export function MediaCatalogGridCard(props: MediaCatalogGridCardProps) {
  const tMedia = useTranslations("media");
  const { media, isKo, imagePreparingLabel, popularIds, footerSlot } = props;
  const priceNum = props.priceMan ?? media.price;
  const tl = typeLabels[media.type];
  const showPricePeriod = props.showPricePeriod ?? false;

  const thumbnailOverlays = (
    <>
      {/* Verified / Network badge */}
      {media.catalogSource !== "network" ? (
        <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          <BadgeCheck className="h-3 w-3" />
          Verified
        </div>
      ) : (
        <div className="absolute right-2.5 top-2.5 z-10 rounded-full bg-navy/85 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          {tMedia("networkSitesBadge", { count: media.networkTotalLocations ?? 0 })}
        </div>
      )}
      {/* Popular flame */}
      {popularIds?.has(media.id) ? (
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-navy shadow">
          <Flame className="h-3 w-3" />
          {isKo ? "인기" : "Popular"}
        </div>
      ) : null}
      {/* Variant-specific left slot */}
      {props.variant === "link" ? props.topLeftSlot : null}
      {props.variant === "selectable" ? (
        <div
          className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
          aria-hidden
        >
          <span
            className={cn(
              "flex h-3.5 w-3.5 items-center justify-center rounded border-2 text-[9px] font-bold",
              props.selected
                ? "border-gold bg-gold text-navy"
                : "border-navy/20 bg-white text-transparent",
            )}
          >
            {props.selected ? "✓" : ""}
          </span>
        </div>
      ) : null}
    </>
  );

  const hasTraffic =
    typeof media.dailyFootTraffic === "number" && media.dailyFootTraffic > 0;

  const body = (
    <div
      className={cn(
        mediaCatalogGridCardShellClass,
        "border border-navy/[0.07] shadow-sm",
        props.variant === "selectable" && props.selected
          ? "border-gold ring-2 ring-gold/20"
          : "",
      )}
    >
      {/* ── Image ── */}
      <MediaCatalogThumbnail
        media={media}
        placeholderLabel={imagePreparingLabel}
        className="h-44 w-full sm:h-48"
        bottomGradientClassName="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent"
        placeholderSize="md"
      >
        {thumbnailOverlays}
      </MediaCatalogThumbnail>

      {/* ── Info ── */}
      <div className="px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        {/* Type badge */}
        <div className="mb-2">
          <Badge
            variant="secondary"
            className="bg-navy/6 px-2 py-0.5 text-[10px] font-semibold text-navy"
          >
            {isKo ? (tl?.ko ?? media.type) : (tl?.en ?? media.type)}
          </Badge>
        </div>

        {/* Name */}
        <p className="mb-1.5 line-clamp-2 text-[13px] font-bold leading-snug text-navy sm:text-sm">
          {isKo ? media.name : media.nameEn}
        </p>

        {/* Location */}
        <div className="mb-2.5 flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-400" />
          <span className="min-w-0 truncate">{formatMediaLocationShort(media, isKo)}</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold tabular-nums text-amber-700 sm:text-base">
            {formatMediaPriceWonWithSymbol(priceNum)}
          </span>
          {showPricePeriod ? (
            <span className="text-[11px] font-normal text-muted-foreground">
              · {tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}
            </span>
          ) : null}
        </div>

        {/* Foot traffic */}
        {hasTraffic ? (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
            <Users className="h-2.5 w-2.5 shrink-0 text-slate-400" />
            <span>
              {isKo
                ? `일 ${media.dailyFootTraffic.toLocaleString()}명`
                : `${media.dailyFootTraffic.toLocaleString()}/day`}
            </span>
          </div>
        ) : null}

        {/* Optional footer (compare/quote buttons etc.) */}
        {footerSlot ? <div className="mt-3">{footerSlot}</div> : null}
      </div>
    </div>
  );

  const wrapClass = cn(
    "block min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
    props.className,
  );

  if (props.variant === "link") {
    return (
      <Link
        href={mediaItemDetailPath(media.id)}
        aria-label={isKo ? media.name : media.nameEn}
        className={wrapClass}
      >
        {body}
      </Link>
    );
  }

  return (
    <label
      className={cn(
        wrapClass,
        "cursor-pointer focus-within:ring-2 focus-within:ring-gold/40",
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={props.selected}
        onChange={props.onToggleSelected}
        aria-label={props.selectionAriaLabel}
      />
      {body}
    </label>
  );
}
