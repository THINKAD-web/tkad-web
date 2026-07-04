"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { DiscoveryMediaCardActions } from "@/components/discovery/discovery-media-card-actions";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { buildCatalogItemMetricLine } from "@/lib/media-card-metrics";
import {
  formatCatalogPriceFieldWon,
  formatPricePeriodShortLabel,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import type { DiscoveryMediaCardCatalogProps } from "@/components/discovery/media-card-types";

type FeedProps = Pick<
  DiscoveryMediaCardCatalogProps,
  | "item"
  | "href"
  | "highlights"
  | "priceLabel"
  | "isKo"
  | "inCompare"
  | "inCart"
  | "onToggleCompare"
  | "onToggleCart"
  | "plannerMode"
  | "isInPlan"
  | "onTogglePlan"
  | "rank"
  | "showPlanButton"
>;

function collectGalleryImages(item: HomeCatalogMediaItem): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const u of [item.thumbnailUrl, ...(item.galleryImages ?? [])]) {
    const t = u?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    urls.push(t);
  }
  return urls.slice(0, 6);
}

function CategoryTrustLine({
  type,
  trustScore,
  isKo,
}: {
  type?: string;
  trustScore?: number;
  isKo: boolean;
}) {
  if (!type && trustScore == null) return null;
  const parts: string[] = [];
  if (type?.trim()) parts.push(type.trim());
  if (trustScore != null) {
    parts.push(isKo ? `신뢰도 ${trustScore}` : `Trust ${trustScore}`);
  }
  return (
    <p className="tkad-type-label text-tkad-muted">
      {parts.join(" · ")}
    </p>
  );
}

export function DiscoveryMediaCardFeed({
  item,
  href,
  highlights = [],
  priceLabel = null,
  isKo = true,
  inCompare = false,
  onToggleCompare,
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  rank,
  showPlanButton = true,
}: FeedProps) {
  const locale = isKo ? "ko-KR" : "en-US";
  const images = collectGalleryImages(item);
  const heroSrc = images[0];
  const heroImage = heroSrc ? catalogThumbnailImageProps(heroSrc) : null;
  const extraImages = images.length - 1;
  const metricLine = buildCatalogItemMetricLine(item, isKo, locale);
  const periodLabel = formatPricePeriodShortLabel(
    item.pricePeriod,
    isKo ? "ko" : "en",
  );

  const formattedNumericPrice =
    item.price && item.price > 0
      ? formatCatalogPriceFieldWon(item.price, locale)
      : null;
  const displayPrice =
    priceLabel?.trim() || formattedNumericPrice || null;

  const planItem = planCartItemFromCatalog(item, "search");

  const thumbBlock = (
    <div className="relative aspect-[4/3] h-full min-h-[6.5rem] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-gray-800">
      {rank != null ? (
        <span className="absolute left-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-black text-white shadow-md">
          {rank}
        </span>
      ) : null}
      {heroImage ? (
        <Image
          src={heroImage.src}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 38vw, 200px"
          unoptimized={heroImage.unoptimized}
        />
      ) : (
        <div className="tkad-type-note flex h-full items-center justify-center text-tkad-muted">
          {isKo ? "이미지 준비중" : "No image"}
        </div>
      )}
      <MediaThumbnailTrustOverlay
        item={item}
        isKo={isKo}
        variant="feed"
        verifiedOnly
      />
      {metricLine ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-1.5 pt-6">
          <p className="tkad-type-meta line-clamp-1 font-medium tabular-nums text-white/95">
            {metricLine}
          </p>
        </div>
      ) : null}
      {extraImages > 0 ? (
        <span className="tkad-type-note absolute bottom-1.5 right-1.5 z-20 rounded-md bg-black/60 px-1.5 py-0.5 font-semibold text-white backdrop-blur-sm">
          +{extraImages}
        </span>
      ) : null}
    </div>
  );

  return (
    <article
      className="discovery-media-card-feed min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
      data-discovery-media-card="feed"
    >
      <div className="flex min-w-0 items-stretch gap-3 p-3 sm:gap-4 sm:p-3.5">
        <div className="w-[38%] min-w-[7.25rem] max-w-[11rem] shrink-0 self-stretch sm:min-w-[8rem] sm:max-w-[12rem]">
          {plannerMode && onTogglePlan ? (
            <button
              type="button"
              onClick={onTogglePlan}
              className="block h-full w-full text-left"
            >
              {thumbBlock}
            </button>
          ) : (
            <Link href={href} className="block h-full w-full">
              {thumbBlock}
            </Link>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
          <div className="min-w-0 space-y-1">
            <CategoryTrustLine
              type={item.type}
              trustScore={item.trustScore}
              isKo={isKo}
            />
            <Link href={href} className="group block">
              <h3 className="tkad-type-title line-clamp-2 text-foreground group-hover:text-tkad-accent">
                {item.name}
              </h3>
            </Link>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
              {displayPrice ?? (isKo ? "문의" : "Inquire")}
            </p>
            {displayPrice && !priceLabel?.trim() && periodLabel ? (
              <span className="tkad-type-note text-tkad-muted">{periodLabel}</span>
            ) : null}
            <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
          </div>

          {highlights.length > 0 ? (
            <p className="tkad-type-note line-clamp-1 text-tkad-muted">
              {highlights.slice(0, 2).join(" · ")}
            </p>
          ) : null}

          <div className="mt-auto pt-1">
            {plannerMode && onTogglePlan ? (
              <button
                type="button"
                onClick={onTogglePlan}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors",
                  isInPlan
                    ? "border border-violet-400/50 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                    : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
                )}
              >
                {isInPlan ? (
                  <>
                    <Check className="h-4 w-4" />
                    {isKo ? "담김 ✓" : "Added ✓"}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    {isKo ? "+ 플랜 담기" : "+ Add to plan"}
                  </>
                )}
              </button>
            ) : showPlanButton ? (
              <DiscoveryMediaCardActions
                mediaId={item.id}
                planItem={planItem}
                detailHref={href}
                isKo={isKo}
                inCompare={inCompare}
                onToggleCompare={onToggleCompare}
                addedFrom="search"
                layout="dense"
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
