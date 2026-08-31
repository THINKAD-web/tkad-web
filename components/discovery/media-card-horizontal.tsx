"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { DiscoveryMediaCardActions } from "@/components/discovery/discovery-media-card-actions";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import { MediaTrustScoreBadge } from "@/components/media/media-trust-score";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import type { MediaCardDisplayModel } from "@/lib/media-card-display";
import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";
import { cn } from "@/lib/utils";

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
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {type?.trim() ? (
        <p className="tkad-type-label text-tkad-muted">{type.trim()}</p>
      ) : null}
      {trustScore != null ? (
        <MediaTrustScoreBadge score={trustScore} isKo={isKo} compact />
      ) : null}
    </div>
  );
}

export type DiscoveryMediaCardHorizontalProps = {
  model: MediaCardDisplayModel;
  isKo?: boolean;
  rank?: number;
  className?: string;
  /** 지도 리스트 — 카드 전체 클릭 */
  interactive?: boolean;
  selected?: boolean;
  hovered?: boolean;
  onActivate?: () => void;
  plannerMode?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  showPlanButton?: boolean;
  inCompare?: boolean;
  onToggleCompare?: () => void;
  planItem?: Omit<PlanCartItem, "addedAt">;
  addedFrom?: PlanCartAddedFrom;
  stopPropagation?: boolean;
};

export function DiscoveryMediaCardHorizontal({
  model,
  isKo = true,
  rank,
  className,
  interactive = false,
  selected = false,
  hovered = false,
  onActivate,
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  showPlanButton = true,
  inCompare = false,
  onToggleCompare,
  planItem,
  addedFrom = "search",
  stopPropagation = false,
}: DiscoveryMediaCardHorizontalProps) {
  const heroImage = model.thumbnailUrl
    ? catalogThumbnailImageProps(model.thumbnailUrl)
    : null;

  const narrowMetric = model.metricLineCompact ?? model.metricLine;

  const thumbInner = (
    <>
      {rank != null ? (
        <span className="absolute left-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-hermes text-[10px] font-black text-white shadow-md">
          {rank}
        </span>
      ) : null}
      {heroImage ? (
        <Image
          src={heroImage.src}
          alt={model.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 200px"
          unoptimized={heroImage.unoptimized}
        />
      ) : (
        <div className="tkad-type-note flex h-full items-center justify-center text-tkad-muted">
          {isKo ? "이미지 준비중" : "No image"}
        </div>
      )}
      <MediaThumbnailTrustOverlay
        item={{ isVerified: model.isVerified, isInstantBooking: false }}
        isKo={isKo}
        variant="feed"
        verifiedOnly
      />
      {model.metricLine ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-1.5 pt-6 @[300px]:block">
          <p className="tkad-type-meta truncate font-medium tabular-nums text-white/95">
            {model.metricLine}
          </p>
        </div>
      ) : null}
      {model.galleryExtraCount > 0 ? (
        <span className="tkad-type-note absolute bottom-1.5 right-1.5 z-20 rounded-md bg-black/60 px-1.5 py-0.5 font-semibold text-white backdrop-blur-sm">
          +{model.galleryExtraCount}
        </span>
      ) : null}
    </>
  );

  const thumbShellClass =
    "relative aspect-[4/3] w-full min-h-[10.5rem] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-gray-800 sm:min-h-[11rem]";

  const thumbBlock =
    plannerMode && onTogglePlan ? (
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          onTogglePlan();
        }}
        className={cn(thumbShellClass, "block text-left")}
      >
        {thumbInner}
      </button>
    ) : interactive ? (
      <div className={thumbShellClass}>{thumbInner}</div>
    ) : (
      <Link href={model.detailHref} className={cn(thumbShellClass, "block")}>
        {thumbInner}
      </Link>
    );

  const titleBlock = (
    <Link
      href={model.detailHref}
      className="group block"
      onClick={
        stopPropagation
          ? (e) => {
              e.stopPropagation();
            }
          : undefined
      }
    >
      <h3 className="tkad-type-title line-clamp-2 text-foreground group-hover:text-tkad-accent">
        {model.name}
      </h3>
    </Link>
  );

  const actionsProps = {
    mediaId: model.id,
    planItem: planItem!,
    detailHref: model.detailHref,
    isKo,
    inCompare,
    onToggleCompare,
    addedFrom,
    stopPropagation,
  };

  const actionsBlock =
    plannerMode && onTogglePlan ? (
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          onTogglePlan();
        }}
        title={isInPlan ? (isKo ? "다시 누르면 빼기" : "Tap again to remove") : undefined}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors",
          isInPlan
            ? "border border-rose-400/50 bg-rose-500/15 text-rose-700 dark:text-rose-200"
            : "bg-hermes text-white",
        )}
      >
        {isInPlan ? (
          <>
            <X className="h-4 w-4" />
            {isKo ? "빼기" : "Remove"}
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            {isKo ? "플랜 담기" : "Add to plan"}
          </>
        )}
      </button>
    ) : showPlanButton && planItem ? (
      <>
        <div className="@[300px]:hidden">
          <DiscoveryMediaCardActions {...actionsProps} layout="grid-cell" />
        </div>
        <div className="hidden @[300px]:block">
          <DiscoveryMediaCardActions {...actionsProps} layout="dense" />
        </div>
      </>
    ) : null;

  return (
    <article
      className={cn(
        "@container discovery-media-card-horizontal min-w-0 max-w-full overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-white/[0.04]",
        selected
          ? "border-2 border-hermes/90 shadow-md shadow-hermes/15 ring-2 ring-inset ring-hermes/35 dark:border-hermes"
          : hovered
            ? "border-hermes/50 dark:border-hermes/40"
            : "border-gray-100 dark:border-white/10",
        interactive &&
          "cursor-pointer transition-ui hover:shadow-md active:scale-[0.99]",
        className,
      )}
      data-discovery-media-card="horizontal"
      onClick={interactive ? onActivate : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onActivate?.();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="flex min-w-0 flex-col items-stretch gap-2.5 p-2.5 @[300px]:flex-row @[300px]:gap-3 @[300px]:p-3 sm:@[300px]:gap-4 sm:@[300px]:p-3.5">
        <div className="w-full shrink-0 @[300px]:w-[45%] @[300px]:min-w-[9rem] @[300px]:max-w-[14rem] @[300px]:self-stretch">
          {thumbBlock}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
          <div className="min-w-0 space-y-1">
            {model.type ? (
              <span className="tkad-type-note inline-block max-w-full truncate rounded-md bg-gray-100 px-1.5 py-0.5 font-medium capitalize text-tkad-muted dark:bg-white/10 @[300px]:hidden">
                {model.type}
              </span>
            ) : null}
            <div className="hidden @[300px]:block">
              <CategoryTrustLine
                type={model.type}
                trustScore={model.trustScore}
                isKo={isKo}
              />
            </div>
            {interactive ? (
              <h3 className="tkad-type-title line-clamp-2 text-foreground">
                {model.name}
              </h3>
            ) : (
              titleBlock
            )}
          </div>

          {narrowMetric ? (
            <p className="tkad-type-meta tabular-nums text-tkad-muted @[300px]:hidden">
              {narrowMetric}
            </p>
          ) : null}

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
              {model.priceLabel}
            </p>
            {model.showPeriodSuffix && model.periodLabel ? (
              <span className="tkad-type-note text-tkad-muted">
                /{model.periodLabel}
              </span>
            ) : null}
            <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
          </div>

          {model.highlights.length > 0 ? (
            <>
              <p className="tkad-type-note line-clamp-1 text-tkad-muted @[300px]:hidden">
                {model.highlights[0]}
              </p>
              <p className="tkad-type-note hidden line-clamp-1 text-tkad-muted @[300px]:block">
                {model.highlights.slice(0, 2).join(" · ")}
              </p>
            </>
          ) : null}

          <div className="mt-auto pt-1">{actionsBlock}</div>
        </div>
      </div>
    </article>
  );
}
