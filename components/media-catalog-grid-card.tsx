"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MapPin, BadgeCheck, Flame } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";

/** 매체 검색 그리드 카드와 동일한 셸 (리스트/비교/견적 공통) */
export const mediaCatalogGridCardShellClass =
  "relative min-w-0 overflow-hidden gap-0 py-0 transition-shadow hover:shadow-lg motion-safe:hover:translate-y-0 sm:motion-safe:hover:-translate-y-[2px]";

type Common = {
  media: MediaItem;
  isKo: boolean;
  imagePreparingLabel: string;
  popularIds?: ReadonlySet<string>;
  /** 카탈로그 `price`와 동일 만원 단위 (네트워크 월 환산 등) */
  priceMan?: number;
  showPricePeriod?: boolean;
  className?: string;
};

export type MediaCatalogGridCardProps =
  | (Common & {
      variant: "link";
      /** 썸네일 좌측 상단 (예: 비교 체크박스). 링크 전파 차단은 슬롯에서 처리 */
      topLeftSlot?: ReactNode;
    })
  | (Common & {
      variant: "selectable";
      selected: boolean;
      onToggleSelected: () => void;
      selectionAriaLabel: string;
    });

export function MediaCatalogGridCard(props: MediaCatalogGridCardProps) {
  const tMedia = useTranslations("media");
  const { media, isKo, imagePreparingLabel, popularIds } = props;
  const priceNum = props.priceMan ?? media.price;
  const tl = typeLabels[media.type];
  const showPricePeriod = props.showPricePeriod ?? false;

  const thumbnailOverlays = (
    <>
      {media.catalogSource !== "network" ? (
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <BadgeCheck className="h-3 w-3" />
          Verified
        </div>
      ) : (
        <div className="absolute top-2.5 right-2.5 z-10 rounded-full bg-navy/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          {tMedia("networkSitesBadge", {
            count: media.networkTotalLocations ?? 0,
          })}
        </div>
      )}
      {props.variant === "link" ? props.topLeftSlot : null}
      {props.variant === "selectable" ? (
        <div
          className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex size-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
          aria-hidden
        >
          <span
            className={cn(
              "flex h-3.5 w-3.5 items-center justify-center rounded border-2 text-[9px] font-bold",
              props.selected
                ? "border-gold bg-gold text-navy"
                : "border-navy/20 bg-white text-transparent",
            )}
          >
            {props.selected ? "✓" : ""}
          </span>
        </div>
      ) : null}
      {popularIds?.has(media.id) ? (
        <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy shadow-sm">
          <Flame className="h-3 w-3" />
          {isKo ? "인기" : "Popular"}
        </div>
      ) : null}
    </>
  );

  const body = (
    <>
      <MediaCatalogThumbnail
        media={media}
        placeholderLabel={imagePreparingLabel}
        className="flex h-[7.25rem] items-center justify-center sm:h-36"
        bottomGradientClassName="absolute inset-0 bg-gradient-to-t from-navy/60 via-navy/10 to-transparent"
      >
        {thumbnailOverlays}
      </MediaCatalogThumbnail>
      <CardHeader className="relative z-0 min-w-0 space-y-1 px-3 pb-1.5 pt-2 sm:px-4 sm:pb-2 sm:pt-2">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="bg-navy/5 text-[11px] text-navy sm:text-xs"
          >
            {isKo ? (tl?.ko ?? media.type) : (tl?.en ?? media.type)}
          </Badge>
        </div>
        <CardTitle className="line-clamp-2 min-w-0 break-words text-[13px] leading-snug sm:text-sm">
          {isKo ? media.name : media.nameEn}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-0 min-w-0 space-y-1.5 px-3 pb-2.5 pt-0 sm:px-4 sm:pb-3">
        <div className="flex min-w-0 items-start gap-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0 line-clamp-2 sm:line-clamp-2">
            {formatMediaLocationShort(media, isKo)}
          </span>
        </div>
        <div className="min-w-0 break-words text-[15px] font-bold tabular-nums leading-tight text-navy sm:text-base sm:leading-normal">
          {formatMediaPriceWonWithSymbol(priceNum)}
          {showPricePeriod ? (
            <span className="text-xs font-normal text-muted-foreground">
              {" "}
              · {tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}
            </span>
          ) : null}
        </div>
      </CardContent>
    </>
  );

  const wrapClass = cn(
    "block min-w-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
    props.className,
  );

  if (props.variant === "link") {
    return (
      <Link
        href={mediaItemDetailPath(media.id)}
        aria-label={isKo ? media.name : media.nameEn}
        className={wrapClass}
      >
        <Card className={mediaCatalogGridCardShellClass}>{body}</Card>
      </Link>
    );
  }

  return (
    <label
      className={cn(
        wrapClass,
        "cursor-pointer focus-within:ring-2 focus-within:ring-gold/40",
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={props.selected}
        onChange={props.onToggleSelected}
        aria-label={props.selectionAriaLabel}
      />
      <Card
        className={cn(
          mediaCatalogGridCardShellClass,
          "border-2 border-transparent",
          props.selected && "border-gold ring-2 ring-gold/20",
        )}
      >
        {body}
      </Card>
    </label>
  );
}
