"use client";

import { Link } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaTrustGradeBadges } from "@/components/media/media-trust-grade-badges";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { dedupeImageUrls, typeLabels } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  getCheapestMediaPriceOption,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { pickTrustBadgesForThumbnail } from "@/lib/media-trust";
import { useTranslations } from "next-intl";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";

type Props = {
  media: MediaItem;
  isKo: boolean;
  imagePreparingLabel: string;
  rank?: number;
  className?: string;
};

export function MediaCatalogListCard({
  media,
  isKo,
  imagePreparingLabel,
  rank,
  className,
}: Props) {
  const tMedia = useTranslations("media");
  const cheapest = getCheapestMediaPriceOption(media);
  const priceWon = cheapest?.priceWon ?? media.price;
  const displayPeriod = cheapest?.period ?? media.pricePeriod;
  const showPricePeriod = !!cheapest;
  const periodLabel = tMedia(mediaPricePeriodTranslationKey(displayPeriod));

  const primaryThumb =
    dedupeImageUrls(media.sampleImages ?? [])[0]?.trim() || null;

  const typeLabel = isKo
    ? (typeLabels[media.type]?.ko ?? media.type)
    : (typeLabels[media.type]?.en ?? media.type);

  const isNetwork = media.catalogSource === "network";
  const networkSites = media.networkTotalLocations ?? 0;
  const networkPerUnit = media.networkPricePerUnit ?? null;

  const location = formatMediaLocationShort(media, isKo);
  const hasRating =
    media.reviewCount != null &&
    media.reviewCount > 0 &&
    media.averageRating != null &&
    media.averageRating > 0;

  const hotBadge = pickTrustBadgesForThumbnail(media.trustBadges, 1).find(
    (b) => b.id === "popular" || b.id === "hot_week",
  );

  const execCount = media.executionCount ?? 0;
  const monthsAgo = media.lastExecutionMonthsAgo;

  return (
    <Link
      href={mediaItemDetailPath(media)}
      className={cn(
        "relative flex gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors",
        "hover:border-violet-300 hover:bg-gray-50/80 active:scale-[0.995]",
        "dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-500/30 dark:hover:bg-white/[0.05]",
        className,
      )}
    >
      {rank != null ? (
        <span
          className="absolute left-2 top-2 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-orange-500 px-1 text-[11px] font-bold text-white shadow-sm"
          aria-hidden
        >
          {rank}
        </span>
      ) : null}

      <MediaCatalogThumbnail
        media={media}
        primaryImageUrl={primaryThumb}
        placeholderLabel={imagePreparingLabel}
        className="relative h-[90px] w-[120px] shrink-0 overflow-hidden rounded-lg"
        bottomGradientClassName={null}
        placeholderSize="xs"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 py-0.5">
        <div className="min-w-0 space-y-0.5">
          <h3 className="line-clamp-1 text-sm font-bold text-gray-900 dark:text-white">
            {isNetwork ? (
              <span className="mr-1 inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 py-0.5 align-middle text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                <span aria-hidden>🌐</span>
                {isKo ? "네트워크" : "Network"}
              </span>
            ) : null}
            {isKo ? media.name : (media.nameEn || media.name)}
          </h3>
          <p className="line-clamp-1 text-xs text-gray-500 dark:text-white/50">
            {isNetwork && networkSites > 0
              ? `${isKo ? "전국" : "Nationwide"} ${networkSites.toLocaleString()}${isKo ? "개소" : " sites"} · ${typeLabel}`
              : `${location} · ${typeLabel}`}
          </p>
          {hasRating ? (
            <p className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{media.averageRating!.toFixed(1)}</span>
              <span className="text-gray-400 dark:text-white/40">
                ({media.reviewCount})
              </span>
            </p>
          ) : null}
          {execCount > 0 ? (
            <p className="text-[10px] text-gray-400 dark:text-white/40">
              {isKo ? `${execCount}회 집행` : `${execCount} flights`}
              {monthsAgo != null
                ? isKo
                  ? ` · ${monthsAgo <= 0 ? "1개월 이내" : `${monthsAgo}개월 전`}`
                  : ` · ${monthsAgo <= 0 ? "<1 mo" : `${monthsAgo} mo ago`}`
                : null}
            </p>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-2">
          <MediaTrustGradeBadges media={media} isKo={isKo} compact />
          <div className="ml-auto shrink-0 text-right">
            <p className="text-base font-black tabular-nums text-gray-900 dark:text-white">
              {isNetwork && networkPerUnit != null && networkPerUnit > 0 ? (
                <>
                  {formatMediaPriceWonWithSymbol(networkPerUnit)}
                  <span className="ml-0.5 text-[10px] font-normal text-gray-500 dark:text-white/50">
                    {isKo ? "/대·월" : "/unit·mo"}
                  </span>
                </>
              ) : (
                <>
                  {formatMediaPriceWonWithSymbol(priceWon)}
                  {showPricePeriod ? (
                    <span className="ml-0.5 text-[10px] font-normal text-gray-500 dark:text-white/50">
                      /{periodLabel}
                    </span>
                  ) : null}
                </>
              )}
            </p>
            <MediaPriceExclNote isKo={isKo} className="mt-0.5 text-right" />
            {hotBadge ? (
              <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-300">
                {isKo ? "인기" : "Hot"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
