"use client";

import Link from "next/link";
import Image from "next/image";
import { Eye, MapPin, ArrowUpRight, Check, Plus } from "lucide-react";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import {
  MediaExecutionSummary,
  MediaTrustScoreBadge,
} from "@/components/media/media-trust-score";
import { MediaQuoteCtaButton } from "@/components/media-quote-cta";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import type { MediaItem } from "@/lib/media-data";
import { resolveMediaCpmWon } from "@/lib/compare-quote";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import {
  formatCatalogPriceFieldWon,
  formatCpmKrw,
  formatPricePeriodShortLabel,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Props = {
  item: HomeCatalogMediaItem;
  href: string;
  highlights: string[];
  locationLine: string | null;
  isKo: boolean;
  inCompare: boolean;
  inCart: boolean;
  onToggleCompare: () => void;
  onToggleCart: () => void;
  plannerMode?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  rank?: number;
  showPlanButton?: boolean;
};

function catalogToMediaItem(item: HomeCatalogMediaItem): MediaItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameEn: item.name,
    location: item.location ?? item.region ?? "",
    locationEn: item.location ?? item.region ?? "",
    region: "seoul",
    type: "digital",
    price: item.price ?? 0,
    pricePeriod: item.pricePeriod,
    lat: 0,
    lng: 0,
    dailyFootTraffic: item.dailyFootTraffic ?? 0,
    visibilityScore: item.visibilityScore,
    sampleImages:
      item.galleryImages ??
      (item.thumbnailUrl ? [item.thumbnailUrl] : []),
  };
}

function collectGalleryImages(item: HomeCatalogMediaItem): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const u of [
    item.thumbnailUrl,
    ...(item.galleryImages ?? []),
  ]) {
    const t = u?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    urls.push(t);
  }
  return urls.slice(0, 6);
}

function formatMonthlyExposure(monthly: number, isKo: boolean): string {
  if (monthly <= 0) return "—";
  if (isKo) {
    const man = monthly / 10_000;
    if (man >= 100) return `${Math.round(man).toLocaleString("ko-KR")}만`;
    return `${(Math.round(man * 100) / 100).toLocaleString("ko-KR")}만`;
  }
  if (monthly >= 1_000_000) return `${(monthly / 1_000_000).toFixed(1)}M`;
  return `${Math.round(monthly / 1000)}K`;
}

function FeedKpiChip({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 dark:border-white/10 dark:bg-white/5">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">
        {label}
      </p>
      <p className="mt-0.5 font-display text-xs font-bold tabular-nums text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export function MediaFeedCard({
  item,
  href,
  highlights,
  locationLine,
  isKo,
  inCompare,
  inCart,
  onToggleCompare,
  onToggleCart,
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  rank,
  showPlanButton = true,
}: Props) {
  const media = catalogToMediaItem(item);
  const images = collectGalleryImages(item);
  const heroSrc = images[0];
  const heroImage = heroSrc ? catalogThumbnailImageProps(heroSrc) : null;
  const extraImages = images.length - 1;

  const metrics = resolvePerformanceMetrics(media);
  const cpm = resolveMediaCpmWon(media);
  const periodLabel = formatPricePeriodShortLabel(item.pricePeriod, isKo ? "ko" : "en");

  const tags = Array.from(
    new Set(
      [item.size, item.type, ...highlights].filter(
        (t): t is string => typeof t === "string" && t.trim().length > 0,
      ),
    ),
  );

  const locationDisplay =
    locationLine ?? item.region ?? (isKo ? "위치 정보 없음" : "No location");

  const showTrust =
    item.trustScore != null || item.executionCount != null;

  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex min-w-0 flex-col gap-4 p-4 sm:gap-5 md:flex-row md:items-stretch">
        {plannerMode && onTogglePlan ? (
          <button
            type="button"
            onClick={onTogglePlan}
            className="relative block min-h-0 shrink-0 text-left md:w-[48%] lg:w-[50%]"
          >
            <div className="relative aspect-[4/3] h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-gray-800 md:aspect-auto md:rounded-2xl">
              {rank != null ? (
                <span className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-black text-white shadow-md">
                  {rank}
                </span>
              ) : null}
              {heroImage ? (
                <Image
                  src={heroImage.src}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, min(58vw, 560px)"
                  unoptimized={heroImage.unoptimized}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-300 dark:text-white/25">
                  {isKo ? "이미지 준비중" : "No image"}
                </div>
              )}
              <MediaThumbnailTrustOverlay item={item} isKo={isKo} variant="feed" />
              {extraImages > 0 ? (
                <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  +{extraImages}
                </span>
              ) : null}
            </div>
          </button>
        ) : (
        <Link
          href={href}
          className="relative block min-h-0 shrink-0 md:w-[48%] lg:w-[50%]"
        >
          <div className="relative aspect-[4/3] h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-gray-800 md:aspect-auto md:rounded-2xl">
            {rank != null ? (
              <span className="absolute left-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-black text-white shadow-md">
                {rank}
              </span>
            ) : null}
            {heroImage ? (
              <Image
                src={heroImage.src}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, min(58vw, 560px)"
                unoptimized={heroImage.unoptimized}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-300 dark:text-white/25">
                {isKo ? "이미지 준비중" : "No image"}
              </div>
            )}
            <MediaThumbnailTrustOverlay
              item={item}
              isKo={isKo}
              variant="feed"
            />
            {extraImages > 0 ? (
              <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                +{extraImages}
              </span>
            ) : null}
          </div>
        </Link>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3">
          <div>
            {item.type ? (
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300/90">
                {item.type}
              </p>
            ) : null}
            <Link href={href} className="group mt-1 block">
              <h3 className="text-lg font-black leading-snug tracking-tight text-gray-900 group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300 sm:text-xl">
                {item.name}
              </h3>
            </Link>
            {tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:border-white/12 dark:text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {showTrust ? (
              <div className="mt-2 space-y-1">
                {item.trustScore != null ? (
                  <MediaTrustScoreBadge
                    score={item.trustScore}
                    isKo={isKo}
                    compact
                  />
                ) : null}
                {item.executionCount != null ? (
                  <MediaExecutionSummary
                    count={item.executionCount}
                    monthsAgo={item.lastExecutionMonthsAgo ?? null}
                    isKo={isKo}
                    className="text-xs text-gray-500 dark:text-white/45"
                  />
                ) : null}
              </div>
            ) : item.advertiserHistory?.trim() ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-white/45">
                {item.advertiserHistory}
              </p>
            ) : null}
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600 dark:text-white/65">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{locationDisplay}</span>
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/40">
              {isKo ? "가격" : "Price"}
            </p>
            <p className="mt-0.5 break-all font-display text-xl font-black tabular-nums text-gray-900 sm:text-2xl dark:text-white">
              {item.price && item.price > 0
                ? formatCatalogPriceFieldWon(item.price, isKo ? "ko-KR" : "en-US")
                : isKo
                  ? "문의"
                  : "Inquire"}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-white/50">
              {periodLabel}
            </p>
            <MediaPriceExclNote isKo={isKo} className="mt-1" />
          </div>

          <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-3">
            <FeedKpiChip
              label={isKo ? "월 노출" : "Monthly reach"}
              value={formatMonthlyExposure(metrics.monthlyImpressions, isKo)}
            />
            <FeedKpiChip
              label="CPM"
              value={cpm != null ? formatCpmKrw(cpm, isKo ? "ko-KR" : "en-US") : "—"}
            />
            <FeedKpiChip
              label={isKo ? "가시성" : "Visibility"}
              value={
                <span className="inline-flex items-center gap-0.5">
                  <Eye className="h-3 w-3" aria-hidden />
                  {metrics.visibilityScore}
                </span>
              }
            />
          </div>

          <div className="mt-1 space-y-2 border-t border-gray-100 pt-3 dark:border-white/8">
            {plannerMode && onTogglePlan ? (
              <button
                type="button"
                onClick={onTogglePlan}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors",
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
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <MediaQuoteCtaButton
                    media={media}
                    variant="feed"
                    className="min-w-0 w-full flex-none"
                  />
                  <Link
                    href={href}
                    className="inline-flex h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-white/14 dark:bg-white/6 dark:text-white/90 dark:hover:bg-white/10"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {isKo ? "상세 보기" : "View details"}
                  </Link>
                </div>
                {showPlanButton ? (
                  <PlanCartAddButton
                    item={planCartItemFromCatalog(item, "search")}
                    addedFrom="search"
                    compact
                    className="w-full"
                  />
                ) : null}
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/40">
                  {isKo ? "매체 담기" : "Save media"}
                </p>
                <div className="grid grid-cols-[1fr_1fr_2.25rem] items-stretch gap-2">
                  <MediaCompareSelectButton
                    selected={inCompare}
                    onToggle={onToggleCompare}
                    feedLabeled
                  />
                  <MediaCartAddButton
                    inCart={inCart}
                    onToggle={onToggleCart}
                    feedLabeled
                  />
                  <MediaFavoriteButton
                    mediaId={item.id}
                    mediaName={item.name}
                    compact
                    className="h-8 w-full shrink-0 justify-center rounded-lg border border-gray-200 dark:border-white/14"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
