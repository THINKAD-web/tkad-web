"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  ArrowUpRight,
  MessageCircle,
  Plus,
  Check,
} from "lucide-react";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { catalogItemToDisplayModel } from "@/lib/media-card-display";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { cn } from "@/lib/utils";

type Props = {
  items: HomeCatalogMediaItem[];
  isKo: boolean;
  locale: string;
  getHref: (item: HomeCatalogMediaItem) => string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  inCompare: (id: string) => boolean;
  onToggleCompare: (item: HomeCatalogMediaItem) => void;
  plannerMode?: boolean;
  plannerSelectedIds?: string[];
  onPlannerToggleMedia?: (mediaId: string) => void;
  className?: string;
};

function preloadImageUrl(url: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.decoding = "async";
  img.src = url;
}

function ReelsSlide({
  item,
  href,
  isKo,
  locale,
  inCompare,
  onToggleCompare,
  plannerMode,
  isInPlan,
  onTogglePlan,
  priority,
}: {
  item: HomeCatalogMediaItem;
  href: string;
  isKo: boolean;
  locale: string;
  inCompare: boolean;
  onToggleCompare: () => void;
  plannerMode?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  priority?: boolean;
}) {
  const model = catalogItemToDisplayModel(item, { href, isKo });
  const thumb = item.thumbnailUrl
    ? catalogThumbnailImageProps(item.thumbnailUrl)
    : null;
  const planItem = planCartItemFromCatalog(item, "search");
  const contactHref = `/contact?media=${encodeURIComponent(item.id)}`;

  return (
    <section
      className="relative h-[calc(100dvh-11rem)] min-h-[28rem] w-full shrink-0 snap-start snap-always overflow-hidden rounded-2xl bg-gray-950 sm:h-[calc(100dvh-12rem)]"
      data-reels-slide={item.id}
    >
      {thumb ? (
        <Image
          src={thumb.src}
          alt={item.name}
          fill
          priority={priority}
          className="object-cover"
          sizes="100vw"
          unoptimized={thumb.unoptimized}
        />
      ) : (
        <div className="absolute inset-0 bg-gray-800" />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/15"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 p-4 pb-6 sm:p-5">
        <div className="space-y-1">
          {model.type ? (
            <p className="tkad-type-label text-white/75">
              {model.type}
              {model.trustScore != null
                ? ` · ${isKo ? `신뢰도 ${model.trustScore}` : `Trust ${model.trustScore}`}`
                : ""}
            </p>
          ) : null}
          <h3 className="tkad-type-title line-clamp-2 text-white">{item.name}</h3>
          {model.metricLine ? (
            <p className="tkad-type-meta tabular-nums text-white/85">
              {model.metricLine}
            </p>
          ) : null}
          <p className="tkad-type-price-accent text-white tabular-nums">
            {model.priceLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={href}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/12 px-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
            {isKo ? "상세" : "Details"}
          </Link>
          <Link
            href={contactHref}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
            {isKo ? "문의" : "Contact"}
          </Link>
          {plannerMode && onTogglePlan ? (
            <button
              type="button"
              onClick={onTogglePlan}
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
                isInPlan
                  ? "border-violet-300/60 bg-violet-500/30 text-white"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20",
              )}
              aria-label={isInPlan ? (isKo ? "플랜에서 제거" : "Remove from plan") : (isKo ? "플랜 담기" : "Add to plan")}
            >
              {isInPlan ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
            </button>
          ) : (
            <>
              <PlanCartAddButton
                item={planItem}
                addedFrom="search"
                compact
                className="!h-10 !w-10 !min-w-10 !rounded-xl !px-0"
              />
              <MediaCompareSelectButton
                selected={inCompare}
                onToggle={onToggleCompare}
                className="!h-10 !w-10 !min-w-10 !rounded-xl !px-0"
              />
              <MediaCartAddButton
                item={planItem}
                addedFrom="search"
                className="!h-10 !w-10 !min-w-10 !rounded-xl !px-0"
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function MediaReelsBrowse({
  items,
  isKo,
  locale,
  getHref,
  hasMore,
  loadingMore,
  onLoadMore,
  inCompare,
  onToggleCompare,
  plannerMode = false,
  plannerSelectedIds = [],
  onPlannerToggleMedia,
  className,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const syncActiveIndex = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const slides = root.querySelectorAll<HTMLElement>("[data-reels-slide]");
    if (!slides.length) return;
    const mid = root.scrollTop + root.clientHeight / 2;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((el, i) => {
      const center = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActiveIndex(best);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const onScroll = () => syncActiveIndex();
    root.addEventListener("scroll", onScroll, { passive: true });
    syncActiveIndex();
    return () => root.removeEventListener("scroll", onScroll);
  }, [items.length, syncActiveIndex]);

  useEffect(() => {
    for (let offset = 1; offset <= 2; offset += 1) {
      const next = items[activeIndex + offset];
      const url = next?.thumbnailUrl?.trim();
      if (!url) continue;
      const resolved = catalogThumbnailImageProps(url);
      if (resolved?.src) preloadImageUrl(resolved.src);
    }
  }, [activeIndex, items]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollerRef.current;
    if (!sentinel || !root || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { root, rootMargin: "240px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore, items.length]);

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "min-h-[calc(100dvh-11rem)] snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth [-webkit-overflow-scrolling:touch]",
        className,
      )}
      data-screenshot="media-view-reels"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3 px-1 pb-8 pt-1">
        {items.map((item, index) => (
          <ReelsSlide
            key={item.id}
            item={item}
            href={getHref(item)}
            isKo={isKo}
            locale={locale}
            inCompare={inCompare(item.id)}
            onToggleCompare={() => onToggleCompare(item)}
            plannerMode={plannerMode}
            isInPlan={plannerSelectedIds.includes(item.id)}
            onTogglePlan={
              onPlannerToggleMedia
                ? () => onPlannerToggleMedia(item.id)
                : undefined
            }
            priority={index < 2}
          />
        ))}
        <div ref={sentinelRef} className="h-8 shrink-0 snap-start" aria-hidden />
        {loadingMore ? (
          <p className="tkad-type-meta py-4 text-center text-tkad-muted">
            {isKo ? "불러오는 중…" : "Loading…"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
