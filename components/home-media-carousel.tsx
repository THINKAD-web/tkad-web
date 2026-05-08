"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import {
  catalogPriceFieldToPriceMan,
  formatMediaPriceWonWithSymbol,
} from "@/lib/media-price-format";
import type { MediaItem } from "@/lib/media-data";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
} from "@/lib/ai-recommend-metrics";
import { cn } from "@/lib/utils";

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
    "pointer-events-auto inline-flex h-10 w-10 items-center justify-center border border-white/12 bg-white/6 text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30";

  if (items.length === 0) return null;

  const localeForPrice = isKo ? "ko" : "en";
  const regionLabel = (region?: string | null) => {
    if (!region) return null;
    if (!isKo) return region;
    const map: Record<string, string> = {
      seoul: "서울",
      busan: "부산",
      daegu: "대구",
      incheon: "인천",
      gwangju: "광주",
      daejeon: "대전",
      ulsan: "울산",
      sejong: "세종",
      gyeonggi: "경기",
      gangwon: "강원",
      chungbuk: "충북",
      chungnam: "충남",
      jeonbuk: "전북",
      jeonnam: "전남",
      gyeongbuk: "경북",
      gyeongnam: "경남",
      jeju: "제주",
    };
    return map[region] ?? region;
  };

  const NeoMediaCard = ({
    media,
    index,
    topRight,
    density,
    typeLabel,
    name,
    location,
    priceText,
  }: {
    media: MediaItem;
    index?: number;
    topRight: React.ReactNode;
    density: "default" | "compact";
    typeLabel: string;
    name: string;
    location: string;
    priceText: string;
  }) => {
    const compact = density === "compact";
    return (
      <Link
        href={mediaItemDetailPath(media.id)}
        className={cn(
          "group relative flex h-full min-w-0 flex-col overflow-hidden transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-black hover:-translate-y-1",
          "tkad-glass-surface",
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.24),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
        />

        <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-black/20">
          {getPrimaryMediaImageUrl(media) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getPrimaryMediaImageUrl(media) ?? undefined}
              alt={name}
              className="h-full w-full object-cover transition-[filter,transform] duration-700 ease-out group-hover:scale-[1.06] group-hover:saturate-[1.08]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">
              [ no image ]
            </div>
          )}

          {topRight ? (
            <div className="absolute right-3 top-3 rounded-2xl border border-white/12 bg-white/8 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/85 backdrop-blur">
              {topRight}
            </div>
          ) : null}

          {index !== undefined ? (
            <div className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/12 bg-black/35 font-mono text-[12px] font-black text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur">
              {index}
            </div>
          ) : null}

          {/* Hover overlay (metrics) */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.92),rgba(0,0,0,0.20),transparent)]" />
            <div className={cn("absolute bottom-0 left-0 right-0 p-4", compact && "p-3")}>
              <div className={cn("grid grid-cols-2 text-white", compact ? "gap-1.5" : "gap-2")}>
                <div
                  className={cn(
                    "rounded-2xl border border-white/12 bg-white/6 backdrop-blur",
                    compact ? "px-3 py-2" : "px-4 py-3",
                  )}
                >
                  <p
                    className={cn(
                      "font-mono font-bold uppercase tracking-[0.22em] text-white/70",
                      compact ? "text-[9px]" : "text-[10px]",
                    )}
                  >
                    {isKo ? "예상 노출" : "Impressions"}
                  </p>
                  <p className={cn("mt-1 font-black tabular-nums", compact ? "text-[12px]" : "text-sm")}>
                    {estimatedMonthlyImpressions(media).toLocaleString()}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-2xl border border-white/12 bg-white/6 backdrop-blur",
                    compact ? "px-3 py-2" : "px-4 py-3",
                  )}
                >
                  <p
                    className={cn(
                      "font-mono font-bold uppercase tracking-[0.22em] text-white/70",
                      compact ? "text-[9px]" : "text-[10px]",
                    )}
                  >
                    CPM
                  </p>
                  <p className={cn("mt-1 font-black tabular-nums", compact ? "text-[12px]" : "text-sm")}>
                    {(() => {
                      const cpm = estimatedCpmWon(media);
                      if (!cpm) return "—";
                      return `₩${Math.round(cpm).toLocaleString()}`;
                    })()}
                  </p>
                </div>
                <div className={cn("col-span-2 pt-1", compact ? "gap-1" : "gap-1.5", "flex flex-wrap")}>
                  {typeof media.visibilityScore === "number" ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-2xl border border-white/12 bg-white/6 font-bold text-white/90 backdrop-blur",
                        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono font-black uppercase tracking-[0.16em] text-white/60",
                          compact ? "text-[9px]" : "text-[10px]",
                        )}
                      >
                        {isKo ? "가시성" : "Visibility"}
                      </span>
                      <span className="tabular-nums">{Math.round(media.visibilityScore)}</span>
                    </span>
                  ) : null}
                  {regionLabel(media.region) ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-2xl border border-white/12 bg-white/6 font-bold text-white/90 backdrop-blur",
                        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono font-black uppercase tracking-[0.16em] text-white/60",
                          compact ? "text-[9px]" : "text-[10px]",
                        )}
                      >
                        {isKo ? "지역" : "Region"}
                      </span>
                      <span>{regionLabel(media.region)}</span>
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-2xl border border-white/12 bg-white/6 font-bold text-white/90 backdrop-blur",
                      compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono font-black uppercase tracking-[0.16em] text-white/60",
                        compact ? "text-[9px]" : "text-[10px]",
                      )}
                    >
                      {isKo ? "유형" : "Type"}
                    </span>
                    <span>{typeLabel}</span>
                  </span>
                </div>
                <div className={cn("col-span-2 pt-1", compact ? "pt-1" : "pt-1.5")}>
                  <div
                    className={cn(
                      "tkad-neon-cta inline-flex w-full items-center justify-center gap-2 text-center font-mono font-black uppercase tracking-[0.22em] text-white transition-transform hover:-translate-y-0.5",
                      compact ? "rounded-lg px-3 py-2 text-[10px]" : "rounded-xl px-3 py-3 text-[11px]",
                    )}
                  >
                    {compact && isKo ? "미리보기" : isKo ? "자세히 보기" : "View details"}
                    <ArrowRight
                      className={compact ? "h-3.5 w-3.5 text-white/80" : "h-4 w-4 text-white/80"}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("relative flex min-w-0 flex-1 flex-col gap-2", compact ? "p-5" : "p-6")}>
          <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
            <span>{typeLabel}</span>
            {location ? <span className="truncate text-white/45">{location}</span> : <span />}
          </div>
          <h3 className={cn("font-black leading-tight tracking-tight text-white", compact ? "text-base sm:text-lg" : "text-lg sm:text-xl")}>
            {name}
          </h3>
          <p className={cn("mt-1 font-mono font-black tabular-nums text-white", compact ? "text-[22px]" : "text-[28px]")}>
            {priceText}
          </p>
          <p className="mt-auto text-xs font-semibold text-white/55">{isKo ? "// 검증 데이터 기반" : "// Verified signals"}</p>
        </div>
      </Link>
    );
  };

  return (
    <div className="tkad-home-media-carousel relative">
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
            const density = isFeatured ? "default" : "compact";
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
                <NeoMediaCard
                  media={media}
                  index={indexLabel}
                  topRight={topRight}
                  density={density}
                  typeLabel={typeLabel}
                  name={name}
                  location={location ?? ""}
                  priceText={priceText}
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
          className={`tkad-home-media-carousel-arrow ${arrowBase}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={scrollNext}
          disabled={!canNext}
          aria-label={isKo ? "다음" : "Next"}
          className={`tkad-home-media-carousel-arrow ${arrowBase}`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
