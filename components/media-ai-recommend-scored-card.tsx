"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import {
  catalogThumbnailImageProps,
  mapMediaItemToHomeCatalog,
} from "@/lib/media-catalog-map";
import { MediaCard } from "@/components/media/media-card";
import { cn } from "@/lib/utils";

/** AI 추천 결과 — 카드 그리드 (썸네일 상단, feed 가로 레이아웃 사용 금지) */
export const RECOMMEND_MEDIA_GRID_CLASS =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export function RecommendScoredMediaCard({
  scored,
  rank,
  isKo,
  locale,
  className,
  quantityControl,
}: {
  scored: ScoredMedia;
  rank?: number;
  isKo: boolean;
  locale: string;
  className?: string;
  quantityControl?: ReactNode;
}) {
  const catalogItem = mapMediaItemToHomeCatalog(scored.item);
  const priceLabel =
    scored.item.price > 0
      ? formatCatalogPriceFieldWon(
          scored.item.price,
          locale.startsWith("ko") ? "ko-KR" : "en-US",
        )
      : null;
  const reason = isKo ? scored.reasons[0]?.ko : scored.reasons[0]?.en;

  return (
    <li className={cn("min-w-0 list-none", className)}>
      <MediaCard
        mode="card"
        item={catalogItem}
        href={mediaItemDetailPath(scored.item)}
        priceLabel={priceLabel}
        isKo={isKo}
        rank={rank}
        showPlanButton
        recommendReason={reason}
        planAddedFrom="ai_recommend"
        inCompare={false}
        inCart={false}
        onToggleCompare={() => {}}
        onToggleCart={() => {}}
        className="h-full"
      />
      {quantityControl ? (
        <div className="mt-2 border-t border-border pt-2">{quantityControl}</div>
      ) : null}
    </li>
  );
}

/** FULL LIST 상단 TOP 3 요약 — 썸네일 포함 */
export function RecommendTop3PickRow({
  scored,
  index,
  isKo,
}: {
  scored: ScoredMedia;
  index: number;
  isKo: boolean;
}) {
  const catalog = mapMediaItemToHomeCatalog(scored.item);
  const thumb = catalog.thumbnailUrl
    ? catalogThumbnailImageProps(catalog.thumbnailUrl)
    : null;
  const name = isKo ? scored.item.name : scored.item.nameEn || scored.item.name;

  return (
    <li className="flex items-center justify-between gap-3 border-t-2 border-border pt-3 first:border-t-0 first:pt-0">
      <span className="inline-flex min-w-0 flex-1 items-center gap-3">
        <Link
          href={mediaItemDetailPath(scored.item)}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 border-border bg-muted"
          aria-label={name}
        >
          {thumb ? (
            <Image
              src={thumb.src}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
              unoptimized={thumb.unoptimized}
            />
          ) : (
            <span className="flex h-full items-center justify-center px-1 text-center text-[9px] font-medium text-muted-foreground">
              {isKo ? "준비중" : "N/A"}
            </span>
          )}
        </Link>
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-[linear-gradient(135deg,#a855f7_0%,#22d3ee_55%,#ec4899_100%)] text-[11px] font-black text-gray-900 shadow-sm dark:text-white">
            {index + 1}
          </span>
          <span className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
            {name}
          </span>
        </span>
      </span>
      <span className="shrink-0 font-display text-xs font-medium uppercase tracking-[0.18em] text-accent">
        {isKo ? `${scored.score}점 궁합` : `MATCH ${scored.score}`}
      </span>
    </li>
  );
}
