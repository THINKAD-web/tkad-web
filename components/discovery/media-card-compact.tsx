"use client";

import { forwardRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ChevronDown, Lightbulb, Plus, X } from "lucide-react";
import { DiscoveryMediaCardActions } from "@/components/discovery/discovery-media-card-actions";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";
import {
  catalogItemToDisplayModel,
  mapItemToDisplayModel,
} from "@/lib/media-card-display";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import { MediaTrustScoreBadge } from "@/components/media/media-trust-score";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
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
                ? "bg-rose-500/20 text-rose-700 dark:text-rose-200"
                : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
            )}
            title={isInPlan ? (isKo ? "다시 누르면 빼기" : "Tap again to remove") : undefined}
          >
            {isInPlan ? (
              <X className="h-3 w-3" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </button>
        ) : (
          <>
            <MediaCompareSelectButton
              mediaId={item.id}
              compareEntry={{
                id: item.id,
                name: item.name,
                nameEn: item.name,
              }}
              gridInline
              className="!h-[1.125rem] !px-1.5 !text-[8px]"
            />
            <MediaCartAddButton
              item={planCartItemFromCatalog(item, "search")}
              addedFrom="search"
              gridInline
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
  | "recommendReason"
  | "recommendRationaleBullets"
  | "recommendRationaleExpandable"
  | "recommendRationaleProminent"
  | "cardFooter"
  | "className"
  | "planAddedFrom"
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
  recommendReason,
  recommendRationaleBullets,
  recommendRationaleExpandable = false,
  recommendRationaleProminent = false,
  cardFooter,
  className,
  planAddedFrom = "search",
}: CompactGridProps) {
  const thumb = catalogThumbnailImageProps(item.thumbnailUrl);
  const [rationaleOpen, setRationaleOpen] = useState(false);
  const extraBullets = recommendRationaleBullets?.filter(Boolean) ?? [];
  const showExpand =
    recommendRationaleExpandable && extraBullets.length > 0;
  const visibleBullets =
    showExpand && rationaleOpen ? extraBullets : extraBullets.slice(0, 0);
  const inlineSecondLine =
    !showExpand && extraBullets.length > 0 ? extraBullets[0] : null;

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
        <p className="tkad-type-title line-clamp-2 leading-snug text-foreground">
          {item.name}
        </p>
        <p className="tkad-type-meta mt-1 line-clamp-1 text-tkad-muted">
          {[item.region, item.type].filter(Boolean).join(" · ") || "\u00a0"}
        </p>
        <div className="mt-auto space-y-2 pt-2">
          {priceLabel ? (
            <div>
              <p className="tkad-type-price-accent tkad-home-accent-text">
                {priceLabel}
              </p>
              <MediaPriceExclNote isKo={isKo} className="tkad-type-note mt-0.5" />
            </div>
          ) : null}
          {plannerMode && onTogglePlan ? (
            <div
              title={isInPlan ? (isKo ? "다시 누르면 빼기" : "Tap again to remove") : undefined}
              className={cn(
                "tkad-type-meta flex h-9 w-full items-center justify-center gap-1.5 rounded-xl font-semibold",
                isInPlan
                  ? "border border-rose-400/50 bg-rose-500/15 text-rose-700 dark:text-rose-200"
                  : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
              )}
            >
              {isInPlan ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  {isKo ? "빼기" : "Remove"}
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  {isKo ? "플랜 담기" : "Add to plan"}
                </>
              )}
            </div>
          ) : showPlanButton ? (
            <div className="flex h-8 items-stretch gap-1">
              <MediaCompareSelectButton
                mediaId={item.id}
                compareEntry={{
                  id: item.id,
                  name: item.name,
                  nameEn: item.name,
                }}
                gridInline
                className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
              />
              <MediaCartAddButton
                item={planCartItemFromCatalog(item, planAddedFrom)}
                addedFrom={planAddedFrom}
                gridInline
                className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
              />
            </div>
          ) : null}
        </div>
      </div>
      {recommendReason?.trim() ? (
        <div
          className={cn(
            recommendRationaleProminent
              ? "mx-1 mb-2 rounded-lg border border-violet-400/35 bg-violet-500/[0.07] px-2.5 py-2 dark:border-violet-400/25 dark:bg-violet-500/10"
              : "px-3 pb-1",
          )}
        >
          {recommendRationaleProminent ? (
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {isKo ? "추천 이유" : "Why recommended"}
            </p>
          ) : null}
          <p
            className={cn(
              "leading-snug",
              recommendRationaleProminent
                ? "line-clamp-2 text-[13px] font-medium text-foreground"
                : "line-clamp-1 text-[11px] text-tkad-accent",
            )}
          >
            {recommendReason}
          </p>
          {inlineSecondLine ? (
            <p
              className={cn(
                "mt-0.5 line-clamp-1 leading-snug",
                recommendRationaleProminent
                  ? "text-[12px] text-muted-foreground"
                  : "text-[10px] text-muted-foreground",
              )}
            >
              {inlineSecondLine}
            </p>
          ) : null}
          {showExpand ? (
            <div className="mt-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRationaleOpen((v) => !v);
                }}
                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                aria-expanded={rationaleOpen}
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    rationaleOpen && "rotate-180",
                  )}
                  aria-hidden
                />
                {isKo ? "추천 근거" : "Why"}
              </button>
              {rationaleOpen ? (
                <ul className="mt-1 space-y-0.5 text-[10px] leading-snug text-muted-foreground">
                  {extraBullets.slice(0, 3).map((line) => (
                    <li key={line} className="line-clamp-2">
                      · {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : visibleBullets.length > 0 ? (
            <ul className="mt-0.5 space-y-0.5 text-[10px] leading-snug text-muted-foreground">
              {visibleBullets.map((line) => (
                <li key={line} className="line-clamp-2">
                  · {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const footerBlock =
    cardFooter != null ? (
      <div
        className="border-t border-border/60 px-2 py-1.5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 overflow-hidden">{cardFooter}</div>
      </div>
    ) : null;

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
          className="flex min-h-0 w-full flex-1 flex-col text-left"
        >
          {body}
        </button>
        {footerBlock}
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <Link
        href={href}
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-shadow hover:shadow-md active:scale-[0.99]",
        )}
      >
        {body}
      </Link>
      {footerBlock}
    </div>
  );
}

type CatalogTileProps = Pick<
  DiscoveryMediaCardCatalogProps,
  | "item"
  | "href"
  | "isKo"
  | "priceLabel"
  | "inCompare"
  | "onToggleCompare"
  | "plannerMode"
  | "isInPlan"
  | "onTogglePlan"
  | "rank"
  | "showPlanButton"
  | "planAddedFrom"
  | "cardFooter"
  | "className"
>;

/** `/media` 카드형·지도 목록과 동일한 세로 스택 타일 (4:3 이미지 + 담기+·비교+) */
export function DiscoveryMediaCardCatalogTile({
  item,
  href,
  isKo = true,
  priceLabel,
  inCompare = false,
  onToggleCompare,
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  rank,
  showPlanButton = true,
  planAddedFrom = "search",
  cardFooter,
  className,
}: CatalogTileProps) {
  const model = catalogItemToDisplayModel(item, { href, isKo, priceLabel });
  const thumb = catalogThumbnailImageProps(item.thumbnailUrl);
  const locationLine = item.region || item.location || "";
  const visScore = item.visibilityScore ?? 0;
  const visTier =
    rank == null && visScore > 0
      ? visibilityPinTierDefForScore(visScore)
      : null;
  const planItem = planCartItemFromCatalog(item, planAddedFrom);

  const imageBlock = (
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

      {rank != null ? (
        <span className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-black text-white shadow-md">
          {rank}
        </span>
      ) : visTier ? (
        <span
          className="tkad-type-note absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 font-bold tabular-nums shadow-sm"
          style={{
            backgroundColor: visTier.fill,
            color: visTier.text,
            border: `1px solid ${visTier.stroke}`,
          }}
        >
          {visScore}
        </span>
      ) : null}

      <MediaThumbnailTrustOverlay item={item} isKo={isKo} variant="card" />

      {model.metricLine ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-1.5 pt-5">
          <p className="tkad-type-meta line-clamp-1 font-medium tabular-nums text-white/95">
            {model.metricLine}
          </p>
        </div>
      ) : null}
    </div>
  );

  const contentBlock = (
      <div className="flex min-h-0 flex-1 flex-col p-2">
      {item.type ? (
        <span className="tkad-type-note mb-1 inline-block max-w-full truncate rounded-md bg-gray-100 px-1.5 py-0.5 font-medium capitalize text-tkad-muted dark:bg-white/10">
          {item.type}
        </span>
      ) : null}
      <p className="tkad-type-title line-clamp-2 leading-snug text-foreground">
        {item.name}
      </p>
      {locationLine ? (
        <p className="tkad-type-meta mt-0.5 line-clamp-1 text-tkad-secondary">
          {locationLine}
        </p>
      ) : null}
      {model.trustScore != null ? (
        <MediaTrustScoreBadge
          score={model.trustScore}
          isKo={isKo}
          compact
          className="mt-1 max-w-full"
        />
      ) : null}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
          {model.priceLabel}
        </p>
        <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
      </div>

      {plannerMode && onTogglePlan ? (
        <div
          title={isInPlan ? (isKo ? "다시 누르면 빼기" : "Tap again to remove") : undefined}
          className={cn(
            "tkad-type-meta mt-2 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg font-semibold",
            isInPlan
              ? "border border-rose-400/50 bg-rose-500/15 text-rose-700 dark:text-rose-200"
              : "bg-gradient-to-r from-violet-500 to-cyan-400 text-white",
          )}
        >
          {isInPlan ? (
            <>
              <X className="h-3.5 w-3.5" />
              {isKo ? "빼기" : "Remove"}
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              {isKo ? "플랜 담기" : "Add to plan"}
            </>
          )}
        </div>
      ) : showPlanButton ? (
        <DiscoveryMediaCardActions
          mediaId={item.id}
          planItem={planItem}
          detailHref={href}
          isKo={isKo}
          inCompare={inCompare}
          onToggleCompare={onToggleCompare}
          addedFrom={planAddedFrom}
          layout="map-tile"
          stopPropagation
        />
      ) : null}
    </div>
  );

  const footerBlock =
    cardFooter != null ? (
      <div
        className="border-t border-border/60 px-2 py-1.5"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 overflow-hidden">{cardFooter}</div>
      </div>
    ) : null;

  const shellClass = cn(
    "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5",
    className,
  );

  if (plannerMode && onTogglePlan) {
    return (
      <div className={shellClass}>
        <button
          type="button"
          onClick={onTogglePlan}
          className="flex min-h-0 w-full flex-1 flex-col text-left"
        >
          {imageBlock}
          {contentBlock}
        </button>
        {footerBlock}
      </div>
    );
  }

  if (cardFooter != null) {
    return (
      <div className={shellClass}>
        <Link href={href} className="flex min-h-0 flex-1 flex-col">
          {imageBlock}
          {contentBlock}
        </Link>
        {footerBlock}
      </div>
    );
  }

  return (
    <Link href={href} className={shellClass}>
      {imageBlock}
      {contentBlock}
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
    onSelect,
    onToggleCompare,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  },
  ref,
) {
  const model = mapItemToDisplayModel(item, locale, isKo);
  const thumb = catalogThumbnailImageProps(item.image);
  const locationLine =
    [item.district, item.region].filter(Boolean).join(" · ") || item.location;
  const visTier =
    item.visibilityScore > 0
      ? visibilityPinTierDefForScore(item.visibilityScore)
      : null;
  const planItem = planCartItemFromCatalog(
    {
      id: item.id,
      name: item.name,
      type: item.type,
      region: item.region,
      price: item.price,
      thumbnailUrl: item.image ?? undefined,
    },
    "map",
  );

  return (
    <li
      ref={ref}
      role="button"
      tabIndex={0}
      className={cn(
        "relative list-none cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-md active:scale-[0.99] dark:bg-white/5",
        selected
          ? "z-0 border-2 border-violet-500/90 shadow-md shadow-violet-500/15 ring-2 ring-inset ring-violet-400/35 dark:border-violet-400"
          : hovered
            ? "border-cyan-400/50 dark:border-cyan-400/40"
            : "border-gray-100 dark:border-white/10",
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
            className="tkad-type-note absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 font-bold tabular-nums shadow-sm"
            style={{
              backgroundColor: visTier.fill,
              color: visTier.text,
              border: `1px solid ${visTier.stroke}`,
            }}
          >
            {item.visibilityScore}
          </span>
        ) : null}

        <MediaThumbnailTrustOverlay
          item={{
            isVerified: item.isVerified,
            isInstantBooking: item.isInstantBooking,
          }}
          isKo={isKo}
          variant="card"
        />

        {model.metricLine ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2 pb-1.5 pt-5">
            <p className="tkad-type-meta line-clamp-1 font-medium tabular-nums text-white/95">
              {model.metricLine}
            </p>
          </div>
        ) : null}
      </div>

      <div className="p-2.5">
        {item.type ? (
          <span className="tkad-type-note mb-1 inline-block max-w-full truncate rounded-md bg-gray-100 px-1.5 py-0.5 font-medium capitalize text-tkad-muted dark:bg-white/10">
            {item.type}
          </span>
        ) : null}
        <p className="tkad-type-title line-clamp-2 leading-snug text-foreground">
          {item.name}
        </p>
        <p className="tkad-type-meta mt-0.5 line-clamp-1 text-tkad-secondary">
          {locationLine}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
            {model.priceLabel}
          </p>
          <MediaPriceExclNote isKo={isKo} className="tkad-type-note" />
        </div>

        <DiscoveryMediaCardActions
          mediaId={item.id}
          planItem={planItem}
          detailHref={model.detailHref}
          isKo={isKo}
          inCompare={inCompare}
          onToggleCompare={onToggleCompare}
          addedFrom="map"
          layout="map-tile"
          stopPropagation
        />
      </div>
    </li>
  );
});
