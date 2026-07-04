"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import { DiscoveryMediaCardActions } from "@/components/discovery/discovery-media-card-actions";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
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
  const parts: string[] = [];
  if (type?.trim()) parts.push(type.trim());
  if (trustScore != null) {
    parts.push(isKo ? `신뢰도 ${trustScore}` : `Trust ${trustScore}`);
  }
  return (
    <p className="tkad-type-label text-tkad-muted">{parts.join(" · ")}</p>
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
          alt={model.name}
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
        item={{ isVerified: model.isVerified, isInstantBooking: false }}
        isKo={isKo}
        variant="feed"
        verifiedOnly
      />
      {model.metricLine ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-1.5 pt-6">
          <p className="tkad-type-meta line-clamp-1 font-medium tabular-nums text-white/95">
            {model.metricLine}
          </p>
        </div>
      ) : null}
      {model.galleryExtraCount > 0 ? (
        <span className="tkad-type-note absolute bottom-1.5 right-1.5 z-20 rounded-md bg-black/60 px-1.5 py-0.5 font-semibold text-white backdrop-blur-sm">
          +{model.galleryExtraCount}
        </span>
      ) : null}
    </div>
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

  const actionsBlock =
    plannerMode && onTogglePlan ? (
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          onTogglePlan();
        }}
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
    ) : showPlanButton && planItem ? (
      <DiscoveryMediaCardActions
        mediaId={model.id}
        planItem={planItem}
        detailHref={model.detailHref}
        isKo={isKo}
        inCompare={inCompare}
        onToggleCompare={onToggleCompare}
        addedFrom={addedFrom}
        layout="dense"
        stopPropagation={stopPropagation}
      />
    ) : null;

  const body = (
    <div className="flex min-w-0 items-stretch gap-3 p-3 sm:gap-4 sm:p-3.5">
      <div className="w-[38%] min-w-[7.25rem] max-w-[11rem] shrink-0 self-stretch sm:min-w-[8rem] sm:max-w-[12rem]">
        {plannerMode && onTogglePlan ? (
          <button
            type="button"
            onClick={(e) => {
              if (stopPropagation) e.stopPropagation();
              onTogglePlan();
            }}
            className="block h-full w-full text-left"
          >
            {thumbBlock}
          </button>
        ) : interactive ? (
          <div className="block h-full w-full">{thumbBlock}</div>
        ) : (
          <Link href={model.detailHref} className="block h-full w-full">
            {thumbBlock}
          </Link>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-0.5">
        <div className="min-w-0 space-y-1">
          <CategoryTrustLine
            type={model.type}
            trustScore={model.trustScore}
            isKo={isKo}
          />
          {interactive ? (
            <h3 className="tkad-type-title line-clamp-2 text-foreground">
              {model.name}
            </h3>
          ) : (
            titleBlock
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
            {model.priceLabel}
          </p>
          {model.showPeriodSuffix && model.periodLabel ? (
            <span className="tkad-type-note text-tkad-muted">
              {model.periodLabel}
            </span>
          ) : null}
          <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
        </div>

        {model.highlights.length > 0 ? (
          <p className="tkad-type-note line-clamp-1 text-tkad-muted">
            {model.highlights.slice(0, 2).join(" · ")}
          </p>
        ) : null}

        <div className="mt-auto pt-1">{actionsBlock}</div>
      </div>
    </div>
  );

  return (
    <article
      className={cn(
        "discovery-media-card-horizontal min-w-0 max-w-full overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-white/[0.04]",
        selected
          ? "border-2 border-violet-500/90 shadow-md shadow-violet-500/15 ring-2 ring-inset ring-violet-400/35 dark:border-violet-400"
          : hovered
            ? "border-cyan-400/50 dark:border-cyan-400/40"
            : "border-gray-100 dark:border-white/10",
        interactive && "cursor-pointer transition-all hover:shadow-md active:scale-[0.99]",
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
      {body}
    </article>
  );
}
