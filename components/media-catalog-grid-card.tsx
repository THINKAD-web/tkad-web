"use client";

import type { ReactNode } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Flame } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaFavoriteButton } from "@/components/media-favorite-button";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  catalogPriceFieldToWon,
  formatMediaPriceWonWithSymbol,
  getCheapestMediaPriceOption,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { MEDIA_CATALOG_THUMB_IMG_FILTER_CLASS } from "@/components/media-catalog-shared";
import { MediaAvailabilityBadge } from "@/components/media-availability-badge";
import { MediaRatingBadge } from "@/components/media/media-rating-badge";
import { MediaTrustBadges } from "@/components/media/media-trust-badges";
import { MediaTrustScoreBadge } from "@/components/media/media-trust-score";
import { pickTrustBadgesForThumbnail } from "@/lib/media-trust";
import type { AvailabilityTier } from "@/lib/media-availability-stats";
import { trackGaEvent } from "@/lib/ga-events";

/**
 * 매체 검색 그리드 카드 (리스트/비교/견적 공통).
 * Phase 3 Brutalist: 2px 검정 보더, 사각, 모노 메타, 50% 그레이 → hover 풀 컬러.
 * 그리드 컨테이너에서 보더 겹침 처리를 위해 -mt/-ml 사용.
 */
export const mediaCatalogGridCardShellClass =
  "tkad-catalog-card-shell relative -mt-[2px] -ml-[2px] block min-w-0 border-2 border-border bg-card transition-colors group-hover:bg-muted dark:group-hover:bg-muted";

type Common = {
  media: MediaItem;
  isKo: boolean;
  imagePreparingLabel: string;
  popularIds?: ReadonlySet<string>;
  /** 카탈로그 `price`와 동일 만원 단위 (네트워크 월 환산 등) */
  priceMan?: number;
  /** `priceMan` 지정 시 함께 넘기면 기간 라벨(2주/월 등) 정확히 표시 */
  pricePeriod?: MediaItem["pricePeriod"];
  showPricePeriod?: boolean;
  className?: string;
  denseMobile?: boolean;
  /** 이번 달 가용 등급 (availability-summary API) */
  availabilityTier?: AvailabilityTier;
};

export type MediaCatalogGridCardProps =
  | (Common & {
      variant: "link";
      /** 썸네일 좌측 상단 (예: 비교 체크박스). 링크 전파 차단은 슬롯에서 처리 */
      topLeftSlot?: ReactNode;
      /** /media 그리드: hover 시 찜·빠른 문의 오버레이 */
      quickInquiryOverlay?: boolean;
    })
  | (Common & {
      variant: "selectable";
      selected: boolean;
      onToggleSelected: () => void;
      selectionAriaLabel: string;
    });

export function MediaCatalogGridCard(props: MediaCatalogGridCardProps) {
  const router = useRouter();
  const tMedia = useTranslations("media");
  const { media, isKo, imagePreparingLabel, popularIds } = props;
  const denseMobile = props.denseMobile ?? false;
  // priceMan 명시(예: 네트워크 패키지 월 환산) 가 우선.
  // 없으면 priceOptions + price 중 *가장 저렴한* 옵션을 표시.
  const cheapest = props.priceMan
    ? null
    : getCheapestMediaPriceOption(media);
  // cheapest.priceWon 은 이미 원(₩) 단위 — formatMediaPriceWonWithSymbol 에 그대로 전달.
  // priceMan / media.price 폴백은 기존 동작 유지 (호출부 데이터 단위에 의존).
  const rawPrice = cheapest?.priceWon ?? props.priceMan ?? media.price;
  const priceWon = cheapest?.priceWon ?? catalogPriceFieldToWon(rawPrice);
  const displayPeriod =
    props.pricePeriod ?? cheapest?.period ?? media.pricePeriod;
  const showPricePeriod =
    props.showPricePeriod ?? (!!cheapest || props.pricePeriod != null);
  const tl = typeLabels[media.type];

  const thumbnailOverlays = (
    <>
      {media.catalogSource !== "network" && media.isVerified ? (
        <div className="absolute right-0 top-0 z-10 border-b-2 border-l-2 border-border bg-hermes px-2.5 py-1 tkad-type-label text-white shadow-sm">
          Verified
        </div>
      ) : media.catalogSource === "network" ? (
        <div className="absolute right-0 top-0 z-10 border-b-2 border-l-2 border-border bg-hero-void px-2.5 py-1 tkad-type-label text-hero-fg">
          {tMedia("networkSitesBadge", {
            count: media.networkTotalLocations ?? 0,
          })}
        </div>
      ) : null}
      {pickTrustBadgesForThumbnail(media.trustBadges).map((b, i) => (
        <div
          key={b.id}
          className="absolute left-0 z-10 max-w-[calc(100%-0.5rem)] border-b-2 border-r-2 border-border bg-card/95 px-2 py-1 tkad-type-note font-bold tracking-wide backdrop-blur-sm"
          style={{ top: `${i * 1.75}rem` }}
        >
          {b.emoji} {isKo ? b.labelKo : b.labelEn}
        </div>
      ))}
      {props.variant === "link" ? props.topLeftSlot : null}
      {props.variant === "selectable" ? (
        <div
          className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex size-8 items-center justify-center border-2 border-border bg-card"
          aria-hidden
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center tkad-type-caption font-bold",
              props.selected
                ? "bg-accent text-accent-foreground"
                : "bg-card text-transparent",
            )}
          >
            {props.selected ? "✓" : ""}
          </span>
        </div>
      ) : null}
      {props.availabilityTier && props.availabilityTier !== "unknown" ? (
        <div className="absolute bottom-2 left-2 z-10 w-max max-w-[calc(100%-1rem)]">
          <MediaAvailabilityBadge tier={props.availabilityTier} compact />
        </div>
      ) : null}
      {popularIds?.has(media.id) ? (
        <div className="absolute bottom-0 right-0 z-10 flex items-center gap-1 border-l-2 border-t-2 border-border bg-accent px-2.5 py-1 tkad-type-label text-accent-foreground">
          <Flame className="h-3 w-3" />
          {isKo ? "인기" : "Hot"}
        </div>
      ) : null}
    </>
  );

  const body = (
    <>
      <MediaCatalogThumbnail
        media={media}
        placeholderLabel={imagePreparingLabel}
        className={cn(
          "flex items-center justify-center border-b-2 border-border bg-muted",
          MEDIA_CATALOG_THUMB_IMG_FILTER_CLASS,
          "group-hover:[&_img]:scale-[1.02]",
          denseMobile ? "h-30 sm:h-52 lg:h-60" : "h-44 sm:h-52 lg:h-60",
        )}
        bottomGradientClassName={null}
      >
        {thumbnailOverlays}
      </MediaCatalogThumbnail>
      <div
        className={cn(
          "flex flex-col text-card-foreground",
          denseMobile ? "gap-1 p-3 sm:gap-2.5 sm:p-5" : "gap-2.5 p-5",
        )}
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "font-semibold text-foreground/85",
              denseMobile ? "tkad-type-note sm:text-sm" : "text-xs sm:text-sm",
            )}
          >
            {isKo ? (tl?.ko ?? media.type) : (tl?.en ?? media.type)}
          </span>
        </div>
        <h3
          className={cn(
            "line-clamp-2 break-words font-semibold leading-snug tracking-tight",
            denseMobile ? "text-sm sm:text-lg" : "text-base sm:text-lg",
          )}
        >
          {isKo ? media.name : (media.nameEn || media.name)}
        </h3>
        <p
          className={cn(
            "line-clamp-2 leading-relaxed text-muted-foreground",
            denseMobile ? "tkad-type-caption sm:text-sm" : "text-sm",
          )}
        >
          {formatMediaLocationShort(media, isKo)}
        </p>
        <MediaRatingBadge
          averageRating={media.averageRating}
          reviewCount={media.reviewCount}
          isKo={isKo}
          className="mt-0.5"
        />
        {media.trustScore != null ? (
          <MediaTrustScoreBadge
            score={media.trustScore}
            isKo={isKo}
            compact
            className="mt-1"
          />
        ) : null}
        {media.trustBadges && media.trustBadges.length > 2 ? (
          <MediaTrustBadges
            badges={media.trustBadges.slice(2)}
            isKo={isKo}
            compact
            className="mt-1"
          />
        ) : null}
        <p
          className={cn(
            "mt-0.5 break-words font-black tabular-nums leading-snug",
            denseMobile ? "text-base sm:text-lg" : "text-lg",
          )}
        >
          {formatMediaPriceWonWithSymbol(priceWon)}
          {showPricePeriod ? (
            <span
              className={cn(
                "ml-1.5 font-normal text-muted-foreground",
                denseMobile ? "tkad-type-caption sm:text-sm" : "text-sm",
              )}
            >
              · {tMedia(mediaPricePeriodTranslationKey(displayPeriod))}
            </span>
          ) : null}
        </p>
      </div>
    </>
  );

  const wrapClass = cn(
    "group block min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-accent",
    props.className,
  );

  if (props.variant === "link") {
    return (
      <Link
        href={mediaItemDetailPath(media)}
        aria-label={isKo ? media.name : (media.nameEn || media.name)}
        className={wrapClass}
        onClick={() =>
          trackGaEvent("media_click", {
            media_id: media.id,
            media_type: media.type,
          })
        }
      >
        <div
          className={cn(
            mediaCatalogGridCardShellClass,
            denseMobile &&
              "overflow-hidden rounded-2xl border border-gray-200 shadow-md -mt-0 -ml-0 transition-transform duration-150 active:scale-[0.98] dark:border-white/10 md:rounded-none md:border-2 md:border-border md:shadow-none",
            (props.quickInquiryOverlay ?? false) && "overflow-hidden",
          )}
        >
          {body}
          {denseMobile && props.variant === "link" ? (
            <div
              className="absolute right-2 top-2 z-20 md:hidden"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MediaFavoriteButton
                mediaId={media.id}
                mediaName={media.name}
                mediaNameEn={media.nameEn}
                compact
                className="h-9 w-9 rounded-full border border-white/20 bg-black/40 backdrop-blur-sm"
              />
            </div>
          ) : null}
          {props.quickInquiryOverlay ? (
            <div
              className="absolute inset-x-0 bottom-0 z-30 flex gap-2 border-t-2 border-border dark:bg-black bg-white/75 p-2.5 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 max-md:hidden"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 border-border bg-card px-2 py-2 text-xs font-bold text-card-foreground">
                <MediaFavoriteButton
                  mediaId={media.id}
                  mediaName={media.name}
                  mediaNameEn={media.nameEn}
                  compact
                  className="h-7 w-7 shrink-0 border-0 bg-transparent"
                />
                <span className="truncate">{tMedia("quickInquiryFavorite")}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/contact?media=${encodeURIComponent(media.id)}`);
                }}
                className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg bg-hermes px-2 py-2 text-xs font-bold text-white shadow-md shadow-hermes/25"
              >
                <span className="truncate">{tMedia("quickInquiryCta")}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <label
      className={cn(
        wrapClass,
        "cursor-pointer focus-within:ring-2 focus-within:ring-accent",
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={props.selected}
        onChange={props.onToggleSelected}
        aria-label={props.selectionAriaLabel}
      />
      <div
        className={cn(
          mediaCatalogGridCardShellClass,
          props.selected && "bg-muted ring-2 ring-accent ring-inset",
        )}
      >
        {body}
      </div>
    </label>
  );
}
