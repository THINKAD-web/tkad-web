"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MapPin,
  GitCompare,
  BadgeCheck,
  ExternalLink,
  Tag,
  BarChart3,
  Building2,
  Landmark,
  Maximize2,
  Clock,
  Users,
  ChevronRight,
  Gauge,
  FileDown,
  type LucideIcon,
} from "lucide-react";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { type MediaItem } from "@/lib/media-data";

function RatioBar({
  label,
  value,
  max,
  valueLabel,
}: {
  label: string;
  value: number;
  max: number;
  valueLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const shown = valueLabel ?? value.toLocaleString();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-navy/75">{label}</span>
        <span className="tabular-nums text-muted-foreground">{shown}</span>
      </div>
      <div
        className="h-3.5 overflow-hidden rounded-full bg-navy/[0.08]"
        role="img"
        aria-label={`${label}: ${shown}`}
      >
        <div
          className="h-full min-w-0 rounded-full bg-gradient-to-r from-navy via-[#1a2a6c] to-gold transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SpecRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 py-4 first:pt-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/[0.07] ring-1 ring-navy/[0.06]">
        <Icon className="h-4 w-4 text-navy" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-navy/45">
          {label}
        </div>
        <div className="mt-1 text-sm leading-relaxed text-navy">{children}</div>
      </div>
    </div>
  );
}

function CompareMediaCard({
  media,
  isKo,
  isLowestPrice,
  maxDaily,
  imagePreparingLabel,
}: {
  media: MediaItem;
  isKo: boolean;
  isLowestPrice: boolean;
  maxDaily: number;
  imagePreparingLabel: string;
}) {
  const score = Math.min(
    100,
    Math.max(0, Math.round(media.visibilityScore ?? 0)),
  );
  const loc = isKo ? media.location : media.locationEn;

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-3xl border bg-white shadow-xl shadow-navy/10 ring-1 ring-navy/[0.05] transition-shadow duration-300 hover:shadow-2xl hover:shadow-navy/[0.12]",
        isLowestPrice
          ? "border-gold/55 shadow-xl shadow-amber-900/10 ring-2 ring-gold/40 ring-offset-4 ring-offset-slate-50"
          : "border-navy/12",
      )}
    >
      {/* 1. 대표 이미지 */}
      <MediaCatalogThumbnail
        media={media}
        placeholderLabel={imagePreparingLabel}
        className="relative aspect-[16/10] w-full"
        bottomGradientClassName="absolute inset-0 bg-gradient-to-t from-navy/55 via-navy/10 to-transparent"
        placeholderSize="md"
      >
        {isLowestPrice && (
          <div className="absolute left-3 top-3 z-10">
            <Badge className="border-0 bg-gold px-2.5 py-0.5 text-[11px] font-bold text-navy shadow-sm">
              <Tag className="mr-1 h-3 w-3" />
              {isKo ? "최저가" : "Best price"}
            </Badge>
          </div>
        )}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <BadgeCheck className="h-3 w-3" />
          Verified
        </div>
      </MediaCatalogThumbnail>

      <div className="flex flex-1 flex-col gap-6 p-6 md:gap-7 md:p-8">
        {/* 2. 매체명 / 위치 */}
        <div className="text-center">
          <h2 className="text-lg font-bold leading-snug text-navy md:text-xl">
            {isKo ? media.name : media.nameEn}
          </h2>
          <p className="mx-auto mt-3 flex max-w-[300px] items-start justify-center gap-2 text-left text-sm leading-relaxed text-navy/65">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
            <span className="leading-snug">{loc}</span>
          </p>
          <Link href={`/media/${media.id}`} className="mt-4 inline-block">
            <Button
              variant="outline"
              size="sm"
              className="border-navy/20 text-xs font-bold text-navy hover:bg-navy/5"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              {isKo ? "상세 페이지" : "Detail page"}
            </Button>
          </Link>
        </div>

        {/* 3. 가격 (월) */}
        <div
          className={cn(
            "rounded-2xl border p-5 md:p-6",
            isLowestPrice
              ? "border-gold/45 bg-gradient-to-br from-gold/18 to-amber-50/60"
              : "border-navy/10 bg-slate-50/70",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-navy/50">
            <Tag className="h-3.5 w-3.5 text-navy" />
            {isKo ? "월 가격" : "Monthly price"}
          </div>
          <p className="text-2xl font-extrabold tracking-tight text-navy">
            ₩{media.price.toLocaleString()}
            <span className="ml-1 text-sm font-semibold text-muted-foreground">
              {isKo ? "만원" : " (10K)"}
            </span>
          </p>
        </div>

        {/* 4. 크기 / 해상도 */}
        <div className="rounded-2xl border border-navy/10 bg-white/70 p-5 shadow-sm shadow-navy/[0.04] md:p-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-navy">
            <Maximize2 className="h-4 w-4 text-navy" />
            {isKo ? "크기 / 해상도" : "Size / Resolution"}
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">
                {isKo ? "크기" : "Size"}
              </div>
              <div className="mt-0.5 text-navy">{media.size || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">
                {isKo ? "해상도" : "Resolution"}
              </div>
              <div className="mt-0.5 text-navy">{media.resolution || "—"}</div>
            </div>
          </div>
        </div>

        {/* 5. 일일 유동인구 (그래프) */}
        <div className="rounded-2xl border border-navy/10 bg-white/70 p-5 shadow-sm shadow-navy/[0.04] md:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold text-navy">
            <BarChart3 className="h-4 w-4 text-navy" />
            {isKo ? "일일 유동인구" : "Daily foot traffic"}
          </div>
          <RatioBar
            label={isKo ? "일일 유동" : "Daily"}
            value={media.dailyFootTraffic}
            max={maxDaily}
          />
        </div>

        <div className="divide-y divide-navy/[0.08] rounded-2xl border border-navy/10 bg-white/50 px-4 py-3 md:px-5">
          {/* 6. 운영시간 */}
          <SpecRow
            icon={Clock}
            label={isKo ? "운영시간" : "Hours"}
          >
            {(isKo ? media.operatingHours : media.operatingHoursEn) || "—"}
          </SpecRow>

          {/* 7. 타겟 연령대 */}
          <SpecRow
            icon={Users}
            label={isKo ? "타겟 연령대" : "Target age"}
          >
            {media.targetAge || "—"}
          </SpecRow>

          {/* 8. 광고주 이력 */}
          <SpecRow
            icon={Building2}
            label={isKo ? "광고주 이력" : "Past advertisers"}
          >
            <span className="leading-snug">
              {(isKo ? media.advertiserHistory : media.advertiserHistoryEn) ||
                "—"}
            </span>
          </SpecRow>

          {/* 9. 주변 시설 */}
          <SpecRow
            icon={Landmark}
            label={isKo ? "주변 시설" : "Nearby facilities"}
          >
            <span className="leading-snug">
              {(isKo ? media.nearbyFacilities : media.nearbyFacilitiesEn) ||
                "—"}
            </span>
          </SpecRow>
        </div>

        {/* 10. 가시성 점수 */}
        <div className="rounded-2xl border border-navy/10 bg-white/70 p-5 shadow-sm shadow-navy/[0.04] md:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold text-navy">
            <Gauge className="h-4 w-4 text-navy" />
            {isKo ? "가시성 점수" : "Visibility score"}
          </div>
          <RatioBar
            label={isKo ? "점수" : "Score"}
            value={score}
            max={100}
            valueLabel={isKo ? `${score}점` : `${score}/100`}
          />
        </div>
      </div>
    </article>
  );
}

export default function ComparePageClient({ items }: { items: MediaItem[] }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");

  const { minPrice, maxDaily } = useMemo(() => {
    const prices = items.map((i) => i.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxDaily = Math.max(...items.map((i) => i.dailyFootTraffic), 1);
    return { minPrice, maxDaily };
  }, [items]);

  if (items.length < 2) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <GitCompare className="mb-4 h-16 w-16 text-navy/15" aria-hidden />
        <h1 className="text-2xl font-bold text-navy">
          {isKo ? "비교할 매체를 선택해주세요" : "Select media to compare"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isKo
            ? `매체 검색에서 2~${COMPARE_MAX_ITEMS}개의 매체를 선택하세요`
            : `Select 2–${COMPARE_MAX_ITEMS} media from the media search page`}
        </p>
        <Link href="/media" className="mt-6">
          <Button className="rounded-full bg-gold px-6 font-bold text-navy hover:bg-gold-dark">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isKo ? "매체 검색으로" : "Go to Media Search"}
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="bg-navy py-24 md:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            {isKo ? "매체 비교" : "Media Comparison"}
          </h1>
          <p className="mt-2 max-w-xl mx-auto text-slate-300">
            {isKo
              ? `최대 ${COMPARE_MAX_ITEMS}개까지 비교합니다. 모바일에서는 카드를 좌우로 넘겨 보세요.`
              : `Compare up to ${COMPARE_MAX_ITEMS} media. Swipe horizontally on mobile.`}
          </p>
          <p className="mt-3 flex items-center justify-center gap-1 text-xs text-slate-400 md:hidden">
            <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            {isKo ? "좌우로 스와이프하여 비교" : "Swipe to compare"}
            <ChevronRight className="h-3.5 w-3.5" />
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50 py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-10">
          <div className="mb-8 md:mb-10">
            <Link href="/media">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {isKo ? "매체 검색으로 돌아가기" : "Back to Media Search"}
              </Button>
            </Link>
          </div>

          <div
            className={cn(
              "flex gap-7 pb-3 md:gap-8 lg:gap-10",
              "-mx-2 px-2 sm:-mx-4 sm:px-4 md:mx-0 md:px-0",
              "snap-x snap-mandatory overflow-x-auto scroll-smooth [-webkit-overflow-scrolling:touch]",
              "md:grid md:snap-none md:overflow-visible md:pb-0",
              items.length === 2 && "md:grid-cols-2",
              items.length === 3 && "md:grid-cols-3",
              items.length >= 4 && "md:grid-cols-2 xl:grid-cols-4",
            )}
            style={{ scrollbarGutter: "stable" }}
          >
            {items.map((media) => (
              <div
                key={media.id}
                className={cn(
                  "w-[min(100%,320px)] shrink-0 snap-center snap-always sm:w-[min(100%,360px)]",
                  "md:w-auto md:min-w-0",
                )}
              >
                <CompareMediaCard
                  media={media}
                  isKo={isKo}
                  isLowestPrice={media.price === minPrice}
                  maxDaily={maxDaily}
                  imagePreparingLabel={tMedia("imagePreparing")}
                />
              </div>
            ))}
          </div>

          <p className="mt-2 text-center text-[11px] text-muted-foreground md:hidden">
            {isKo
              ? "유동인구 막대는 이번에 고른 매체 중 최댓값 기준입니다."
              : "Foot-traffic bar is relative to the max among selected media."}
          </p>

          <div className="mt-14 flex flex-col items-stretch gap-4 sm:mt-16 sm:items-center md:gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-navy px-8 font-bold text-white shadow-md hover:bg-navy-light"
              >
                <Link
                  href={`/quote?media=${items.map((m) => m.id).join(",")}`}
                >
                  {isKo ? "견적 요청" : "Request a quote"}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-2 border-gold/50 px-8 font-bold text-navy hover:bg-gold/10"
              >
                <a
                  href={`/api/compare/pdf?ids=${items.map((m) => encodeURIComponent(m.id)).join(",")}${isKo ? "" : "&lang=en"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  {isKo ? "PDF 다운로드" : "Download PDF"}
                </a>
              </Button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              {isKo
                ? "견적 요청 시 위에서 비교 중인 매체가 모두 선택된 상태로 이동합니다."
                : "Quote opens with all media you are comparing pre-selected."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
