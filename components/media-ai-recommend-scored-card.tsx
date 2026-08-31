"use client";

import Image from "next/image";
import { Lightbulb } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import {
  catalogThumbnailImageProps,
  mapMediaItemToHomeCatalog,
} from "@/lib/media-catalog-map";
import { rationaleLinesForLocale } from "@/lib/recommendation-adapters";
import { matchPrecisionLabel } from "@/lib/matching-engine";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import type { MediaCardCompactLayout } from "@/components/discovery/media-card-types";
import type { PlanCartAddedFrom } from "@/lib/plan-cart";
import {
  RECOMMEND_MEDIA_GRID_CLASS,
  RECOMMEND_TOP3_GRID_CLASS,
} from "@/lib/media-browse-grid";
import { cn } from "@/lib/utils";

export { RECOMMEND_MEDIA_GRID_CLASS, RECOMMEND_TOP3_GRID_CLASS };

function resolveRationaleTexts(
  scored: ScoredMedia,
  locale: string,
): { summary: string; bullets: string[] } {
  const fromLines =
    scored.rationaleLines?.length ?
      rationaleLinesForLocale(scored.rationaleLines, locale)
    : [];
  const fromReasons = scored.reasons
    .map((r) => (locale.startsWith("ko") ? r.ko : r.en))
    .filter(Boolean);
  const all = fromLines.length > 0 ? fromLines : fromReasons;
  const summary = all[0] ?? "";
  const bullets = all.slice(1, 3);
  return { summary, bullets };
}

export function RecommendScoredMediaCard({
  scored,
  rank,
  isKo,
  locale,
  className,
  quantityControl,
  rationaleTwoLine = false,
  compactLayout = "map-tile",
  plannerMode = false,
  isInPlan = false,
  onTogglePlan,
  planAddedFrom = "ai_recommend",
  showPlanButton = true,
}: {
  scored: ScoredMedia;
  rank?: number;
  isKo: boolean;
  locale: string;
  className?: string;
  quantityControl?: ReactNode;
  /** TOP3 카드: 요약 + 첫 bullet 2줄 고정 */
  rationaleTwoLine?: boolean;
  /** `map-tile` — `/media` 카드형과 동일; `grid` — 정사각 + 추천 이유 */
  compactLayout?: Extract<MediaCardCompactLayout, "grid" | "map-tile">;
  /** 플래너 Step 4 — 캠페인 담기 토글 (담기+ 대신 플랜 담기) */
  plannerMode?: boolean;
  isInPlan?: boolean;
  onTogglePlan?: () => void;
  planAddedFrom?: PlanCartAddedFrom;
  showPlanButton?: boolean;
}) {
  const catalogItem = mapMediaItemToHomeCatalog(scored.item);
  const priceLabel =
    scored.item.price > 0
      ? formatCatalogPriceFieldWon(
          scored.item.price,
          locale.startsWith("ko") ? "ko-KR" : "en-US",
        )
      : null;
  const { summary, bullets } = resolveRationaleTexts(scored, locale);
  const mapTile = compactLayout === "map-tile";
  const precision = scored.matchPrecision;
  const precisionText = precision
    ? matchPrecisionLabel(precision, isKo)
    : null;

  return (
    <li className={cn("min-w-0 list-none", className)}>
      {precisionText ? (
        <p
          className={cn(
            "mb-1.5 tkad-type-note font-semibold uppercase tracking-wide",
            precision === "exact"
              ? "text-[color:var(--qp-accent)]"
              : "text-muted-foreground",
          )}
        >
          {precision === "exact" ? "● " : "○ "}
          {precisionText}
        </p>
      ) : null}
      <DiscoveryMediaCard
        variant="compact"
        compactLayout={compactLayout}
        item={catalogItem}
        href={mediaItemDetailPath(scored.item)}
        priceLabel={priceLabel}
        isKo={isKo}
        rank={rank}
        planAddedFrom={planAddedFrom}
        showPlanButton={showPlanButton && !plannerMode}
        plannerMode={plannerMode}
        isInPlan={isInPlan}
        onTogglePlan={onTogglePlan}
        recommendReason={mapTile ? undefined : summary}
        recommendRationaleBullets={
          mapTile
            ? undefined
            : rationaleTwoLine
              ? bullets.slice(0, 1)
              : bullets
        }
        recommendRationaleExpandable={
          !mapTile && !rationaleTwoLine && bullets.length > 0
        }
        recommendReasonInside={!mapTile}
        recommendRationaleProminent={!mapTile && rationaleTwoLine}
        cardFooter={quantityControl}
        className="h-full min-h-0"
      />
    </li>
  );
}

/** FULL LIST 상단 TOP 3 요약 — 썸네일 포함 */
export function RecommendTop3PickRow({
  scored,
  index,
  isKo,
  locale,
}: {
  scored: ScoredMedia;
  index: number;
  isKo: boolean;
  locale: string;
}) {
  const catalog = mapMediaItemToHomeCatalog(scored.item);
  const thumb = catalog.thumbnailUrl
    ? catalogThumbnailImageProps(catalog.thumbnailUrl)
    : null;
  const name = isKo ? scored.item.name : scored.item.nameEn || scored.item.name;
  const { summary } = resolveRationaleTexts(
    scored,
    locale.startsWith("ko") ? "ko" : "en",
  );

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
            <span className="flex h-full items-center justify-center px-1 text-center tkad-type-note font-medium text-muted-foreground">
              {isKo ? "준비중" : "N/A"}
            </span>
          )}
        </Link>
        <span className="inline-flex min-w-0 flex-col gap-0.5">
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-[linear-gradient(135deg,#a855f7_0%,#22d3ee_55%,#ec4899_100%)] tkad-type-caption font-black text-gray-900 shadow-sm dark:text-white">
              {index + 1}
            </span>
            <span className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
              {name}
            </span>
          </span>
          {scored.matchPrecision ? (
            <span
              className={cn(
                "pl-9 tkad-type-note font-semibold uppercase tracking-wide",
                scored.matchPrecision === "exact"
                  ? "text-[color:var(--qp-accent)]"
                  : "text-muted-foreground",
              )}
            >
              {matchPrecisionLabel(scored.matchPrecision, isKo)}
            </span>
          ) : null}
          {summary ? (
            <span className="mt-1 line-clamp-2 space-y-0.5 pl-9">
              <span className="flex items-center gap-1 tkad-type-note font-bold uppercase tracking-wide text-[color:var(--qp-accent)]">
                <Lightbulb className="h-3 w-3 shrink-0" aria-hidden />
                {isKo ? "추천 이유" : "Why"}
              </span>
              <span className="block tkad-type-meta font-medium leading-snug text-foreground">
                {summary}
              </span>
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 tkad-type-label text-accent">
        {isKo ? `${scored.score}점 궁합` : `MATCH ${scored.score}`}
      </span>
    </li>
  );
}
