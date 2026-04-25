"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, MapPin, Trophy, Flame } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import {
  VisibilityGauge,
  FootTrafficBadge,
  ImpressionsCompact,
  VerifiedBadge,
  MediaTypeBadge,
} from "@/components/media-metric-viz";
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
  /** Featured TOP3 표시용 — index 1·2·3 뱃지 */
  showRankBadge?: boolean;
  imagePreparingLabel: string;
};

/**
 * Embla 기반 좌우 스크롤 매체 캐러셀.
 * - Featured: 큰 카드(데스크톱 3열), 랭크 뱃지 + KPI
 * - Popular: 컴팩트 카드(데스크톱 4열), 핫 뱃지
 */
export function HomeMediaCarousel({
  items,
  isKo,
  variant,
  showRankBadge = false,
  imagePreparingLabel,
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

  /** 슬라이드 폭: 모바일 1.1열 → 데스크톱 3·4열 */
  const slideClass =
    variant === "featured"
      ? "min-w-0 shrink-0 grow-0 basis-[88%] sm:basis-[60%] md:basis-[44%] lg:basis-[32%]"
      : "min-w-0 shrink-0 grow-0 basis-[70%] sm:basis-[42%] md:basis-[31%] lg:basis-[23.5%]";

  const arrowBase =
    "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-md transition-colors hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed";

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden -mx-2 px-2" ref={emblaRef}>
        <div className="flex gap-4 sm:gap-5">
          {items.map((media, i) =>
            variant === "featured" ? (
              <FeaturedSlide
                key={media.id}
                media={media}
                isKo={isKo}
                rank={showRankBadge ? i + 1 : null}
                imagePreparingLabel={imagePreparingLabel}
                slideClass={slideClass}
              />
            ) : (
              <PopularSlide
                key={media.id}
                media={media}
                isKo={isKo}
                imagePreparingLabel={imagePreparingLabel}
                slideClass={slideClass}
              />
            ),
          )}
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

function FeaturedSlide({
  media,
  isKo,
  rank,
  imagePreparingLabel,
  slideClass,
}: {
  media: MediaItem;
  isKo: boolean;
  rank: number | null;
  imagePreparingLabel: string;
  slideClass: string;
}) {
  const typeLabel = isKo
    ? (typeLabels[media.type]?.ko ?? media.type)
    : (typeLabels[media.type]?.en ?? media.type);
  const daily = media.dailyFootTraffic ?? 0;
  const topPercentile =
    daily >= 100_000
      ? 5
      : daily >= 50_000
        ? 10
        : daily >= 20_000
          ? 25
          : daily >= 10_000
            ? 50
            : null;

  return (
    <div className={slideClass}>
      <Card className="group relative h-full overflow-hidden border-0 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 rounded-2xl py-0">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-gold to-gold-light" />
        <MediaCatalogThumbnail
          media={media}
          placeholderLabel={imagePreparingLabel}
          className="group relative flex h-48 items-center justify-center"
          imgClassName="opacity-90 transition duration-300 group-hover:scale-105"
          bottomGradientClassName="absolute inset-0 bg-gradient-to-t from-navy/45 via-transparent to-transparent"
          placeholderSize="sm"
          alt={isKo ? media.name : media.nameEn || media.name}
          sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 32vw"
        >
          {rank !== null && (
            <div className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light text-lg font-bold text-navy shadow-md">
              <Trophy className="h-4 w-4 mr-0.5 -ml-0.5" aria-hidden />
              {rank}
            </div>
          )}
          <div className="absolute top-4 right-4 z-10">
            <VerifiedBadge className="bg-emerald-500/95 border-emerald-400 text-white shadow-sm" />
          </div>
        </MediaCatalogThumbnail>
        <CardHeader className="pb-3 pt-5">
          <MediaTypeBadge type={media.type} label={typeLabel} />
          <CardTitle className="text-lg font-bold text-navy">
            {isKo ? media.name : media.nameEn || media.name}
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {isKo ? media.location : media.locationEn || media.location}
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="space-y-3 rounded-xl bg-secondary/40 p-3">
            <FootTrafficBadge
              daily={media.dailyFootTraffic}
              topPercentile={topPercentile}
            />
            <VisibilityGauge score={media.visibilityScore ?? 0} />
            <div className="flex items-center justify-between pt-1 border-t border-border/60">
              <ImpressionsCompact
                value={media.monthlyFootTraffic ?? null}
                label={isKo ? "월 노출" : "Mo. impr."}
              />
              {media.dailyFootTraffic > 0 && (
                <ImpressionsCompact
                  value={media.dailyFootTraffic * 30}
                  label={isKo ? "누적/월" : "Monthly"}
                  suffix={isKo ? "명" : ""}
                />
              )}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Link href={`/media/${media.id}`} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="btn-navy-outline w-full rounded-lg text-xs font-semibold"
              >
                {isKo ? "상세 보기" : "View Details"}
              </Button>
            </Link>
            <Link href="/contact" className="flex-1">
              <Button size="sm" className="btn-gold w-full rounded-lg text-xs font-bold">
                {isKo ? "문의하기" : "Inquire"}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PopularSlide({
  media,
  isKo,
  imagePreparingLabel,
  slideClass,
}: {
  media: MediaItem;
  isKo: boolean;
  imagePreparingLabel: string;
  slideClass: string;
}) {
  return (
    <div className={slideClass}>
      <Link
        href={`/media/${media.id}`}
        className="block touch-manipulation h-full"
      >
        <Card className="group h-full overflow-hidden border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-1 py-0">
          <MediaCatalogThumbnail
            media={media}
            placeholderLabel={imagePreparingLabel}
            className="relative flex h-44 items-center justify-center"
            imgClassName="transition-transform duration-300 group-hover:scale-105"
            bottomGradientClassName={null}
            placeholderSize="xs"
          />
          <CardHeader className="space-y-1 p-3 pb-1.5 pt-4">
            <Badge
              variant="secondary"
              className="w-fit bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-semibold inline-flex items-center gap-1"
            >
              <Flame className="h-2.5 w-2.5" aria-hidden />
              {isKo ? "인기" : "Popular"}
            </Badge>
            <CardTitle className="truncate text-sm font-bold leading-snug text-navy">
              {isKo ? media.name : media.nameEn || media.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <div className="flex items-center gap-1 text-xs leading-snug text-muted-foreground truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {isKo ? media.location : media.locationEn || media.location}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
