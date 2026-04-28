"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Flame } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  getCheapestMediaPriceOption,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";

/**
 * 매체 검색 그리드 카드 (리스트/비교/견적 공통).
 * Phase 3 Brutalist: 2px 검정 보더, 사각, 모노 메타, grayscale → hover 컬러.
 * 그리드 컨테이너에서 보더 겹침 처리를 위해 -mt/-ml 사용.
 */
export const mediaCatalogGridCardShellClass =
  "relative -mt-[2px] -ml-[2px] block min-w-0 border-2 border-bx-black bg-bx-white transition-colors group-hover:bg-bx-off";

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
  // priceMan 명시(예: 네트워크 패키지 월 환산) 가 우선.
  // 없으면 priceOptions + price 중 *가장 저렴한* 옵션을 표시.
  const cheapest = props.priceMan
    ? null
    : getCheapestMediaPriceOption(media);
  // cheapest.priceWon 은 이미 원(₩) 단위 — formatMediaPriceWonWithSymbol 에 그대로 전달.
  // priceMan / media.price 폴백은 기존 동작 유지 (호출부 데이터 단위에 의존).
  const priceNum = cheapest?.priceWon ?? props.priceMan ?? media.price;
  const displayPeriod = cheapest?.period ?? media.pricePeriod;
  const tl = typeLabels[media.type];
  // 가장 저렴한 옵션 사용 시에는 단가 단위(월/주/일) 명시 — 비교 혼동 방지
  const showPricePeriod = props.showPricePeriod ?? !!cheapest;

  const thumbnailOverlays = (
    <>
      {media.catalogSource !== "network" ? (
        <div className="absolute right-0 top-0 z-10 border-b-2 border-l-2 border-bx-black bg-bx-accent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bx-white">
          Verified
        </div>
      ) : (
        <div className="absolute right-0 top-0 z-10 border-b-2 border-l-2 border-bx-black bg-bx-black px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bx-white">
          {tMedia("networkSitesBadge", {
            count: media.networkTotalLocations ?? 0,
          })}
        </div>
      )}
      {props.variant === "link" ? props.topLeftSlot : null}
      {props.variant === "selectable" ? (
        <div
          className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex size-8 items-center justify-center border-2 border-bx-black bg-bx-white"
          aria-hidden
        >
          <span
            className={cn(
              "flex h-4 w-4 items-center justify-center text-[11px] font-bold",
              props.selected
                ? "bg-bx-accent text-bx-white"
                : "bg-bx-white text-transparent",
            )}
          >
            {props.selected ? "✓" : ""}
          </span>
        </div>
      ) : null}
      {popularIds?.has(media.id) ? (
        <div className="absolute bottom-0 right-0 z-10 flex items-center gap-1 border-l-2 border-t-2 border-bx-black bg-bx-accent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-bx-white">
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
        className="flex h-44 items-center justify-center border-b-2 border-bx-black bg-bx-off [&_img]:grayscale [&_img]:transition-[filter,transform] [&_img]:duration-500 group-hover:[&_img]:grayscale-0 group-hover:[&_img]:scale-[1.02] sm:h-52 lg:h-60"
        bottomGradientClassName={null}
      >
        {thumbnailOverlays}
      </MediaCatalogThumbnail>
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-bx-gray-dim">
          <span className="text-bx-black">
            [ {isKo ? (tl?.ko ?? media.type) : (tl?.en ?? media.type)} ]
          </span>
        </div>
        <h3 className="line-clamp-2 break-words text-base font-bold leading-tight tracking-tight text-bx-black sm:text-lg">
          {isKo ? media.name : (media.nameEn || media.name)}
        </h3>
        <p className="line-clamp-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
          {`// `}
          {formatMediaLocationShort(media, isKo)}
        </p>
        <p className="mt-1 break-words font-mono text-sm font-bold tabular-nums leading-tight text-bx-black">
          {formatMediaPriceWonWithSymbol(priceNum)}
          {showPricePeriod ? (
            <span className="ml-1 text-[11px] font-normal uppercase tracking-[0.18em] text-bx-gray-dim">
              · {tMedia(mediaPricePeriodTranslationKey(displayPeriod))}
            </span>
          ) : null}
        </p>
      </div>
    </>
  );

  const wrapClass = cn(
    "group block min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-bx-accent",
    props.className,
  );

  if (props.variant === "link") {
    return (
      <Link
        href={mediaItemDetailPath(media.id)}
        aria-label={isKo ? media.name : (media.nameEn || media.name)}
        className={wrapClass}
      >
        <div className={mediaCatalogGridCardShellClass}>{body}</div>
      </Link>
    );
  }

  return (
    <label
      className={cn(
        wrapClass,
        "cursor-pointer focus-within:ring-2 focus-within:ring-bx-accent",
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
          props.selected && "bg-bx-off ring-2 ring-bx-accent ring-inset",
        )}
      >
        {body}
      </div>
    </label>
  );
}
