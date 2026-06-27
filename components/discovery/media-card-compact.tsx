"use client";

import { forwardRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus, MessageCircle } from "lucide-react";
import { Link as I18nLink } from "@/i18n/navigation";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { MapDetailQuickActions } from "@/components/media-map/media-map-detail-sheet";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MapMapItem } from "@/components/media-map/media-map-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { formatMediaPriceWithPeriodSuffix } from "@/lib/media-price-format";
import { buildMapItemMetricLine } from "@/lib/media-map/map-item-metrics";
import { visibilityPinTierDefForScore } from "@/lib/map-pin-visibility-colors";
import { cn } from "@/lib/utils";
import type {
  DiscoveryMediaCardCatalogProps,
  DiscoveryMediaCardMapProps,
} from "@/components/discovery/media-card-types";

type CompactRowProps = Pick<
  DiscoveryMediaCardCatalogProps,
  | "item"
  | "href"
  | "metaLine"
  | "isKo"
  | "inCompare"
  | "inCart"
  | "onToggleCompare"
  | "onToggleCart"
  | "plannerMode"
  | "isInPlan"
  | "onTogglePlan"
  | "rank"
>;

export function DiscoveryMediaCardCompactRow({
  item,
  href,
  metaLine = "",
  isKo = true,
  inCompare = false,
  inCart = false,
  onToggleCompare,
  onToggleCart,
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  rank,
}: CompactRowProps) {
  const rowLink = (
    <>
      <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {rank != null ? (
          <span className="tkad-type-note absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 font-bold text-white">
            {rank}
          </span>
        ) : null}
        {(() => {
          const thumb = catalogThumbnailImageProps(item.thumbnailUrl);
          return thumb ? (
            <Image
              src={thumb.src}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
              unoptimized={thumb.unoptimized}
            />
          ) : (
            <div className="tkad-type-note flex h-full w-full items-center justify-center text-tkad-muted">
              —
            </div>
          );
        })()}
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <p className="tkad-type-title truncate text-foreground">{item.name}</p>
        {metaLine ? (
          <p className="tkad-type-meta truncate text-tkad-muted">
            {metaLine}
            <span className="mx-1 text-tkad-muted/50">·</span>
            <MediaPriceExclNote inline className="tkad-type-note" />
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-h-[3rem] items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors",
        "hover:bg-gray-50 active:bg-gray-100/80 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]",
      )}
    >
      {plannerMode && onTogglePlan ? (
        <button
          type="button"
          onClick={onTogglePlan}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          {rowLink}
        </button>
      ) : (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-2.5">
          {rowLink}
        </Link>
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        {plannerMode && onTogglePlan ? (
          <button
            type="button"
            onClick={onTogglePlan}
            className={cn(
              "tkad-type-note inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 font-semibold",
              isInPlan
                ? "bg-violet-500/20 text-violet-600 dark:text-violet-300"
                : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
            )}
          >
            {isInPlan ? (
              <Check className="h-3 w-3" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </button>
        ) : (
          <>
            <PlanCartAddButton
              item={planCartItemFromCatalog(item, "search")}
              addedFrom="search"
              compact
              className="!h-[1.125rem] !px-1.5 !text-[8px]"
            />
            <MediaCompareSelectButton
              selected={inCompare}
              onToggle={onToggleCompare ?? (() => {})}
              className="!h-[1.125rem] !px-1.5 !text-[8px]"
            />
            <MediaCartAddButton
              inCart={inCart}
              onToggle={onToggleCart ?? (() => {})}
              className="!h-[1.125rem] !px-1.5 !text-[8px]"
            />
          </>
        )}
      </div>
    </div>
  );
}

type CompactGridProps = Pick<
  DiscoveryMediaCardCatalogProps,
  | "item"
  | "href"
  | "isKo"
  | "priceLabel"
  | "inCompare"
  | "inCart"
  | "onToggleCompare"
  | "onToggleCart"
  | "showPlanButton"
  | "plannerMode"
  | "isInPlan"
  | "onTogglePlan"
  | "rank"
  | "className"
>;

export function DiscoveryMediaCardCompactGrid({
  item,
  href,
  isKo = true,
  priceLabel,
  inCompare = false,
  inCart = false,
  onToggleCompare,
  onToggleCart,
  showPlanButton = true,
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  rank,
  className,
}: CompactGridProps) {
  const thumb = catalogThumbnailImageProps(item.thumbnailUrl);

  const body = (
    <>
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {rank != null ? (
          <span className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-black text-white shadow-md">
            {rank}
          </span>
        ) : null}
        {thumb ? (
          <Image
            src={thumb.src}
            alt={item.name}
            fill
            className="rounded-t-2xl object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
            unoptimized={thumb.unoptimized}
          />
        ) : (
          <div className="tkad-type-note flex h-full w-full items-center justify-center text-tkad-muted">
            {isKo ? "준비중" : "No image"}
          </div>
        )}
        <MediaThumbnailTrustOverlay item={item} isKo={isKo} variant="card" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <p className="tkad-type-title line-clamp-2 min-h-[2.5rem] leading-snug text-foreground">
          {item.name}
        </p>
        <p className="tkad-type-meta mt-1 line-clamp-1 min-h-4 text-tkad-muted">
          {[item.region, item.type].filter(Boolean).join(" · ") || "\u00a0"}
        </p>
        <div className="mt-auto space-y-2 pt-2">
          {priceLabel ? (
            <div className="min-h-[2.25rem]">
              <p className="tkad-type-price-accent tkad-home-accent-text">
                {priceLabel}
              </p>
              <MediaPriceExclNote isKo={isKo} className="tkad-type-note mt-0.5" />
            </div>
          ) : (
            <div className="min-h-[2.25rem]" aria-hidden />
          )}
          {plannerMode && onTogglePlan ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePlan();
              }}
              className={cn(
                "tkad-type-meta flex h-9 w-full items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors",
                isInPlan
                  ? "border border-violet-400/50 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                  : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
              )}
            >
              {isInPlan ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {isKo ? "담김 ✓" : "Added ✓"}
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {isKo ? "+ 플랜 담기" : "+ Add to plan"}
                </>
              )}
            </button>
          ) : showPlanButton ? (
            <div className="flex h-8 items-stretch gap-1">
              <PlanCartAddButton
                item={planCartItemFromCatalog(item, "search")}
                addedFrom="search"
                compact
                gridInline
                className="min-w-0 flex-1 !h-8 !px-1 !text-[10px]"
              />
              {onToggleCompare ? (
                <MediaCompareSelectButton
                  selected={inCompare}
                  onToggle={onToggleCompare}
                  gridInline
                  className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
                />
              ) : null}
              {onToggleCart ? (
                <MediaCartAddButton
                  inCart={inCart}
                  onToggle={onToggleCart}
                  gridInline
                  className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  const shellClass = cn(
    "flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5",
    className,
  );

  if (plannerMode && onTogglePlan) {
    return (
      <div className={shellClass}>
        <button
          type="button"
          onClick={onTogglePlan}
          className="flex h-full w-full flex-col text-left"
        >
          {body}
        </button>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        shellClass,
        "transition-shadow hover:shadow-md active:scale-[0.99]",
      )}
    >
      {body}
    </Link>
  );
}

export const DiscoveryMediaCardMapTile = forwardRef<
  HTMLLIElement,
  DiscoveryMediaCardMapProps
>(function DiscoveryMediaCardMapTile(
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
        "relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-md active:scale-[0.99] dark:bg-white/5",
        selected
          ? "z-0 border-2 border-violet-500/90 shadow-md shadow-violet-500/15 ring-2 ring-inset ring-violet-400/35 dark:border-violet-400 dark:shadow-violet-500/20"
          : hovered
            ? "border border-cyan-400/50 dark:border-cyan-400/40"
            : "border border-gray-100 dark:border-white/10",
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
          <div className="tkad-type-note flex h-full w-full items-center justify-center text-tkad-muted">
            {isKo ? "준비중" : "No image"}
          </div>
        )}

        {visTier ? (
          <span
            className="tkad-type-label absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 font-bold tabular-nums shadow-sm"
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
              <span className="tkad-type-note rounded bg-violet-600/90 px-1.5 py-0.5 font-semibold text-white shadow-sm">
                {isKo ? "즉시예약" : "Instant"}
              </span>
            ) : null}
            {item.isVerified ? (
              <span className="tkad-type-note rounded bg-emerald-600/90 px-1.5 py-0.5 font-semibold text-white shadow-sm">
                {isKo ? "검증" : "Verified"}
              </span>
            ) : null}
          </div>
        )}

        {metricLine ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-1.5 pt-5">
            <p className="tkad-type-meta line-clamp-1 font-medium tabular-nums text-white/95">
              {metricLine}
            </p>
          </div>
        ) : null}
      </div>

      <div className="p-2.5">
        <p className="tkad-type-title line-clamp-2 leading-snug text-foreground">
          {item.name}
        </p>
        <p className="tkad-type-meta mt-0.5 line-clamp-1 text-tkad-secondary">
          {locationLine}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
            {priceLabel}
          </p>
          <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
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
          <I18nLink
            href={`/contact?media=${encodeURIComponent(item.id)}`}
            onClick={(e) => e.stopPropagation()}
            className="tkad-media-map-sheet-cta inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-700/30 bg-violet-700 text-white shadow-sm shadow-violet-900/20 transition-colors hover:bg-violet-800"
            aria-label={isKo ? "문의하기" : "Contact"}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          </I18nLink>
        </div>
      </div>
    </li>
  );
});
