"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaCard } from "@/components/brutalist/media-card";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import {
  catalogPriceFieldToPriceMan,
  formatMediaPriceWonWithSymbol,
} from "@/lib/media-price-format";
import type { MediaItem } from "@/lib/media-data";

const typeLabels: Record<string, { ko: string; en: string }> = {
  digital: { ko: "디지털", en: "Digital" },
  static: { ko: "고정형", en: "Static" },
  mobile: { ko: "이동형", en: "Mobile" },
  network: { ko: "네트워크/패키지", en: "Network / package" },
};

type Variant = "featured" | "popular";

type Props = {
  items: MediaItem[];
  isKo: boolean;
  variant: Variant;
  /** Featured 표시용 — index 1·2·3 뱃지 (TOP3 표기는 제거됨, 단순 순번 인디케이터) */
  showRankBadge?: boolean;
};

/**
 * Embla 기반 좌우 스크롤 매체 캐러셀.
 * - Featured: 큰 카드(데스크톱 3열). 옵션으로 순위 인덱스 표시.
 * - Popular: 컴팩트 카드(데스크톱 4열). 우상단 [HOT] 액센트.
 *
 * 카드 디자인은 components/brutalist/media-card.tsx (MediaCard) 통일.
 */
export function HomeMediaCarousel({
  items,
  isKo,
  variant,
  showRankBadge = false,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    skipSnaps: false,
    slidesToScroll: 1,
    containScroll: "trimSnaps",
    dragFree: false,
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi]);

  /** 슬라이드 폭: 모바일 1.x열 → 데스크톱 3·4열 */
  const slideClass =
    variant === "featured"
      ? "min-w-0 shrink-0 grow-0 basis-[88%] sm:basis-[60%] md:basis-[44%] lg:basis-[32%]"
      : "min-w-0 shrink-0 grow-0 basis-[70%] sm:basis-[42%] md:basis-[31%] lg:basis-[23.5%]";

  const arrowBase =
    "pointer-events-auto inline-flex h-10 w-10 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white disabled:opacity-30 disabled:cursor-not-allowed";

  if (items.length === 0) return null;

  const localeForPrice = isKo ? "ko" : "en";

  return (
    <div className="relative">
      <div className="overflow-hidden -mx-2 px-2" ref={emblaRef}>
        <div className="flex gap-4 sm:gap-5">
          {items.map((media, i) => {
            const typeLabel = isKo
              ? (typeLabels[media.type]?.ko ?? media.type)
              : (typeLabels[media.type]?.en ?? media.type);
            const priceMan = catalogPriceFieldToPriceMan(media.price);
            const priceText = formatMediaPriceWonWithSymbol(
              priceMan * 10_000,
              localeForPrice,
            );
            const name = isKo ? media.name : media.nameEn || media.name;
            const location = isKo
              ? media.location
              : media.locationEn || media.location;
            const isFeatured = variant === "featured";
            const indexLabel =
              isFeatured && showRankBadge ? i + 1 : undefined;
            const topRight = isFeatured ? (
              "VERIFIED"
            ) : (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>★</span>
                {isKo ? "HOT" : "HOT"}
              </span>
            );

            return (
              <div key={media.id} className={slideClass}>
                <MediaCard
                  href={mediaItemDetailPath(media.id)}
                  imageSrc={getPrimaryMediaImageUrl(media)}
                  imageAlt={name}
                  index={indexLabel}
                  type={typeLabel}
                  name={name}
                  location={location}
                  price={priceText}
                  topRight={topRight}
                  className="h-full"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 화살표 — 모바일에선 카드 좌우 끝, 데스크톱에선 카드 외부 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1 sm:-mx-3 lg:-mx-5">
        <button
          type="button"
          onClick={scrollPrev}
          disabled={!canPrev}
          aria-label={isKo ? "이전" : "Previous"}
          className={arrowBase}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          disabled={!canNext}
          aria-label={isKo ? "다음" : "Next"}
          className={arrowBase}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
