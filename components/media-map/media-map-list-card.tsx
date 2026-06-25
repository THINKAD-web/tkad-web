"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";
import { buildMapItemMetricLine } from "@/lib/media-map/map-item-metrics";
import { visibilityPinTierDefForScore } from "@/lib/map-pin-visibility-colors";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { MapDetailQuickActions } from "@/components/media-map/media-map-detail-sheet";

type Props = {
  item: MapMapItem;
  isKo?: boolean;
  locale: string;
  selected?: boolean;
  hovered?: boolean;
  inCompare?: boolean;
  inCart?: boolean;
  onSelect: (id: string) => void;
  onToggleCompare?: () => void;
  onToggleCart?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export const MediaMapListCard = forwardRef<HTMLLIElement, Props>(
  function MediaMapListCard(
    {
      item,
      isKo = true,
      locale,
      selected = false,
      hovered = false,
      inCompare,
      inCart,
      onSelect,
      onToggleCompare,
      onToggleCart,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
    },
    ref,
  ) {
    const thumb = catalogThumbnailImageProps(item.image);
    const locationLine =
      [item.district, item.region].filter(Boolean).join(" · ") || item.location;
    const priceLabel = formatMediaPriceWithPeriodSuffix(
      item.price,
      item.pricePeriod,
      locale,
    );
    const metricLine = buildMapItemMetricLine(item, isKo, locale);
    const visTier =
      item.visibilityScore > 0
        ? visibilityPinTierDefForScore(item.visibilityScore)
        : null;

    return (
      <li
        ref={ref}
        role="button"
        tabIndex={0}
        className={cn(
          "cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5",
          selected
            ? "border-violet-400/60 ring-2 ring-violet-400/20"
            : hovered
              ? "border-cyan-400/40"
              : "",
        )}
        onClick={() => onSelect(item.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(item.id);
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {thumb ? (
            <Image
              src={thumb.src}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 280px"
              unoptimized={thumb.unoptimized}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
              {isKo ? "준비중" : "No image"}
            </div>
          )}

          {visTier ? (
            <span
              className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-sm"
              style={{
                backgroundColor: visTier.fill,
                color: visTier.text,
                border: `1px solid ${visTier.stroke}`,
              }}
            >
              {item.visibilityScore}
            </span>
          ) : null}

          {(item.isInstantBooking || item.isVerified) && (
            <div className="absolute right-1.5 top-1.5 flex max-w-[calc(100%-3rem)] flex-col items-end gap-0.5">
              {item.isInstantBooking ? (
                <span className="rounded bg-violet-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                  {isKo ? "즉시예약" : "Instant"}
                </span>
              ) : null}
              {item.isVerified ? (
                <span className="rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">
                  {isKo ? "검증" : "Verified"}
                </span>
              ) : null}
            </div>
          )}

          {metricLine ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-1.5 pt-5">
              <p className="line-clamp-1 text-[10px] font-medium tabular-nums text-white/95">
                {metricLine}
              </p>
            </div>
          ) : null}
        </div>

        <div className="p-2.5">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
            {item.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500 dark:text-white/45">
            {locationLine}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <p className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {priceLabel}
            </p>
            <MediaPriceExclNote isKo={isKo} className="text-[10px]" />
          </div>

          <div className="mt-2 flex items-stretch gap-1.5">
            <MapDetailQuickActions
              item={item}
              inCompare={inCompare}
              inCart={inCart}
              onToggleCompare={onToggleCompare}
              onToggleCart={onToggleCart}
              size="compact"
              className="mt-0 min-w-0 flex-1"
            />
            <Link
              href={`/contact?media=${encodeURIComponent(item.id)}`}
              onClick={(e) => e.stopPropagation()}
              className="tkad-media-map-sheet-cta inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-700/30 bg-violet-700 text-white shadow-sm shadow-violet-900/20 transition-colors hover:bg-violet-800"
              aria-label={isKo ? "문의하기" : "Contact"}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </li>
    );
  },
);
