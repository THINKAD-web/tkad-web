"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import type { MediaItem } from "@/lib/media-data";
import { MediaCard } from "@/components/media/media-card";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import { mediaCardStaticHandlers } from "@/lib/media-card-static-handlers";

type Variant = "featured" | "popular";

type Props = {
  items: MediaItem[];
  variant: Variant;
  /** Featured 표시용 — index 1·2·3 뱃지 (TOP3 표기는 제거됨, 단순 순번 인디케이터) */
  showRankBadge?: boolean;
};

/**
 * Embla 기반 좌우 스크롤 매체 캐러셀.
 * - Featured: 큰 카드(데스크톱 3열). 옵션으로 순위 인덱스 표시.
 * - Popular: 컴팩트 카드(데스크톱 4열).
 *
 * 카드 디자인은 components/media/media-card.tsx (MediaCard) 통일.
 */
export function HomeMediaCarousel({
  items,
  variant,
  showRankBadge = false,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const th = useTranslations("homePage");
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
    "pointer-events-auto inline-flex h-10 w-10 items-center justify-center border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-900 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-white/22 hover:dark:bg-white/10 bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30";

  if (items.length === 0) return null;

  const localeForPrice = isKo ? "ko" : "en";
  const isFeatured = variant === "featured";

  return (
    <div className="tkad-home-media-carousel relative">
      <div className="overflow-hidden -mx-2 px-2" ref={emblaRef}>
        <div className="flex gap-4 sm:gap-5">
          {items.map((media, i) => {
            const priceText = formatCatalogPriceFieldWon(media.price, localeForPrice);

            return (
              <div key={media.id} className={slideClass}>
                <MediaCard
                  mode="card"
                  item={mapMediaItemToHomeCatalog(media)}
                  href={mediaItemDetailPath(media)}
                  priceLabel={priceText}
                  isKo={isKo}
                  rank={isFeatured && showRankBadge ? i + 1 : undefined}
                  showPlanButton
                  {...mediaCardStaticHandlers}
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
          aria-label={th("carouselPrev")}
          className={`tkad-home-media-carousel-arrow ${arrowBase}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          disabled={!canNext}
          aria-label={th("carouselNext")}
          className={`tkad-home-media-carousel-arrow ${arrowBase}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
