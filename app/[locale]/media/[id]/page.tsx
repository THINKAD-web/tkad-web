import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Calculator,
  CircleDollarSign,
  Eye,
  MapPin,
  Monitor,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  buildCaseStudyGalleryItems,
  getAllMediaIds,
  getMediaDetailGalleryUrls,
  getSimilarMediaFromCatalog,
  typeLabels,
} from "@/lib/media-data";
import {
  getAllKeywordFilterMediaIds,
  getSimilarKeywordFilterMediaItems,
  heroTagCandidatesFromKeyword,
  pickSearchKeywordHints,
} from "@/lib/keyword-filter-media-detail";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatCatalogPriceFieldWon,
  formatCatalogPriceKrwLong,
  formatMediaPriceWonWithSymbol,
  mediaDetailPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import type { MediaPricePeriodKey } from "@/lib/media-data";
import MediaCaseStudyGallery from "@/components/media-case-study-gallery";
import { fetchPublicMediaCatalog, resolveMediaForDetail } from "@/lib/public-media-catalog";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import MediaDetailExtras from "@/components/media-detail-extras";
import MediaDetailPerformance from "@/components/media-detail-performance";
import MediaDetailPremiumPoints from "@/components/media-detail-premium-points";
import MediaDetailStickyCta from "@/components/media-detail-sticky-cta";
import MediaSimilarCarousel from "@/components/media-similar-carousel";
import MediaDetailAdminActions from "@/components/media-detail-admin-actions";
import TrackMediaView from "@/components/track-media-view";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import MediaDetailHeroGallery from "@/components/media-detail-hero-gallery";

type Props = { params: Promise<{ locale: string; id: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  const ids = [
    ...getAllMediaIds(),
    ...getAllKeywordFilterMediaIds(),
  ];
  return ids.map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const media = await resolveMediaForDetail(id);
  if (!media) return { title: "Media" };
  const title =
    locale === "ko" ? `${media.name} | THINKAD` : `${media.nameEn} | THINKAD`;
  const won = media.keywordFilter
    ? Math.round(
        (media.keywordFilter.budgetMin + media.keywordFilter.budgetMax) / 2,
      )
    : media.price * 10_000;
  const description = media.keywordFilter
    ? locale === "ko"
      ? `${media.location} · ${media.keywordFilter.priceText}`
      : `${media.locationEn} · ${media.keywordFilter.priceText}`
    : locale === "ko"
      ? `${media.location} · ${won.toLocaleString()}원`
      : `${media.locationEn} · ₩${won.toLocaleString()}`;
  return { title, description };
}

export default async function MediaDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id: idStr } = await params;
  const media = await resolveMediaForDetail(idStr);
  if (!media) notFound();

  const catalog = await fetchPublicMediaCatalog();
  const t = await getTranslations({ locale, namespace: "media.detail" });
  const isKo = locale === "ko";
  const periodLabel = t(
    mediaDetailPricePeriodTranslationKey(media.pricePeriod),
  );

  const priceOptions = Array.isArray(media.priceOptions)
    ? media.priceOptions
    : undefined;
  const hasPriceOptions = Boolean(priceOptions && priceOptions.length > 0);
  const primaryPriceOption = priceOptions?.[0];

  const primaryPricePeriodLabel = primaryPriceOption?.period
    ? t(
        mediaDetailPricePeriodTranslationKey(
          primaryPriceOption.period as MediaPricePeriodKey,
        ),
      )
    : periodLabel;

  const monthly =
    media.monthlyFootTraffic ??
    Math.round(media.dailyFootTraffic * 30);

  const similar = media.keywordFilter
    ? getSimilarKeywordFilterMediaItems(media.id, 3)
    : getSimilarMediaFromCatalog(catalog, media, 3);
  const galleryImages = getMediaDetailGalleryUrls(media);
  const heroImage = galleryImages[0] ?? "";
  const caseStudyItems = buildCaseStudyGalleryItems(media);
  const typeLabel =
    (isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en) ?? "";
  const featuresText = isKo ? media.features : media.featuresEn;
  const performanceMetrics = resolvePerformanceMetrics(media);
  const compareHref =
    similar.length > 0
      ? `/compare?ids=${media.id},${similar[0].id}`
      : "/media";

  const heroTags = media.keywordFilter
    ? heroTagCandidatesFromKeyword(media.keywordFilter, media.size)
    : [
        media.size,
        typeLabel,
        ...(media.targetAge
          ? media.targetAge
              .split(/[,，]/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 3)
          : []),
      ].filter((x): x is string => Boolean(x && String(x).trim()));

  const keywordHints = media.keywordFilter
    ? pickSearchKeywordHints(media.keywordFilter.searchKeywords)
    : [];

  const overviewBody = (() => {
    const cat = (
      isKo ? media.catalogDescription : media.catalogDescriptionEn
    )?.trim();
    if (cat) return cat;
    const long = (
      isKo ? media.longDescriptionKo : media.longDescriptionEn
    )?.trim();
    if (long) return long;
    const desc = (isKo ? media.description : media.descriptionEn)?.trim();
    return desc ?? "";
  })();

  return (
    <>
      <TrackMediaView mediaId={media.id} />
      {/* 메인 이미지 + 히어로 오버레이 (네트워크 매체와 유사 구조) */}
      <MediaDetailHeroGallery
        images={galleryImages}
        heroSrc={heroImage}
        altBase={isKo ? media.name : media.nameEn}
        labels={{
          close: t("galleryLightboxClose"),
          prev: t("galleryLightboxPrev"),
          next: t("galleryLightboxNext"),
          expand: t("galleryExpand"),
          clickHint: t("galleryClickHint"),
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <Link href="/media">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("back")}
              </Button>
            </Link>
            <MediaDetailAdminActions />
          </div>

          <div className="grid gap-6 pb-2 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] lg:items-end">
            <div className="min-w-0 space-y-3 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                  {isKo ? media.name : media.nameEn}
                </h1>
                <Badge
                  variant="secondary"
                  className="shrink-0 border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm sm:text-sm"
                >
                  <Eye className="mr-1 h-3.5 w-3.5 opacity-90" aria-hidden />
                  {t("visibilityBadge", {
                    score: performanceMetrics.visibilityScore,
                  })}
                </Badge>
              </div>
              {heroTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {heroTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-gold/50 bg-black/25 px-2.5 py-0.5 text-[11px] font-semibold text-gold-light backdrop-blur-sm sm:text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-200 sm:text-base">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  {formatMediaLocationShort(media, isKo)}
                </span>
                {typeLabel ? (
                  <>
                    <span className="hidden text-slate-400 sm:inline" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium text-gold">
                      {typeLabel}
                    </span>
                  </>
                ) : null}
              </p>
              {featuresText ? (
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-100/90">
                  {featuresText}
                </p>
              ) : null}
            </div>

            <aside className="min-w-0 rounded-2xl border border-white/15 bg-black/35 p-4 text-sm text-slate-100 shadow-lg shadow-black/40 backdrop-blur-md sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <CoreFact
                  icon={CircleDollarSign}
                  label={t("priceTitle")}
                  value={
                    media.keywordFilter ? (
                      <>
                        {hasPriceOptions && primaryPriceOption ? (
                          <span className="block text-lg font-bold tabular-nums text-gold">
                            {formatCatalogPriceFieldWon(
                              primaryPriceOption.price,
                            )}
                          </span>
                        ) : (
                          <span className="block text-base font-bold tabular-nums text-gold sm:text-lg">
                            {formatMediaPriceWonWithSymbol(
                              media.keywordFilter.budgetMin,
                            )}{" "}
                            <span className="font-semibold text-slate-200/90">
                              ~
                            </span>{" "}
                            {formatMediaPriceWonWithSymbol(
                              media.keywordFilter.budgetMax,
                            )}
                          </span>
                        )}
                        <span className="mt-1 block text-xs font-medium text-gold-light/95">
                          {media.keywordFilter.priceText}
                        </span>
                        {hasPriceOptions ? (
                          <span className="mt-1 block text-[11px] text-slate-200/80">
                            {t("priceOptionsSummaryHint")}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-[11px] text-slate-200/75">
                            {periodLabel}
                          </span>
                        )}
                      </>
                    ) : hasPriceOptions && primaryPriceOption ? (
                      <>
                        <span className="block text-lg font-bold tabular-nums text-gold">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-200/90">
                          {primaryPricePeriodLabel} · {primaryPriceOption.label}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-200/75">
                          {t("priceOptionsSummaryHint")}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block text-lg font-bold tabular-nums text-gold">
                          {formatCatalogPriceFieldWon(media.price)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-200/90">
                          {periodLabel}
                        </span>
                      </>
                    )
                  }
                />
                <CoreFact
                  icon={Users}
                  label={t("footTrafficTitle")}
                  value={
                    <span className="block text-base font-semibold tabular-nums text-white">
                      {monthly.toLocaleString()}
                    </span>
                  }
                />
              </div>
            </aside>
          </div>
        </div>
      </MediaDetailHeroGallery>

      {/* ── 주요 지표 바 ── */}
      <div className="relative overflow-hidden bg-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-navy via-slate-900 to-slate-800" />
        <div className="relative mx-auto grid max-w-4xl grid-cols-3 divide-x divide-white/[0.08] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center px-4 py-8 sm:py-10">
            <p className="text-2xl font-bold tabular-nums text-gold sm:text-3xl">
              {media.keywordFilter
                ? formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMin)
                : formatCatalogPriceFieldWon(
                    hasPriceOptions && primaryPriceOption
                      ? primaryPriceOption.price
                      : media.price,
                  )}
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {isKo ? "광고 단가" : "AD RATE"}
            </p>
          </div>
          <div className="flex flex-col items-center px-4 py-8 sm:py-10">
            <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {monthly.toLocaleString()}
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {isKo ? "월 유동인구" : "MONTHLY TRAFFIC"}
            </p>
          </div>
          <div className="flex flex-col items-center px-4 py-8 sm:py-10">
            <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {performanceMetrics.visibilityScore}
              <span className="ml-1 text-base font-normal text-slate-600">/100</span>
            </p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {isKo ? "노출 지수" : "VISIBILITY"}
            </p>
          </div>
        </div>
      </div>

      <section className="bg-[#f7f8fc] py-14 pb-32 sm:pb-36">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <MediaDetailExtras
            media={media}
            locale={locale}
            labels={{
              locationMap: t("locationMap"),
              openKakao: t("openKakao"),
              openGoogle: t("openGoogle"),
              inquiry: t("inquiry"),
              quote: t("quote"),
              galleryLightboxClose: t("galleryLightboxClose"),
              galleryLightboxPrev: t("galleryLightboxPrev"),
              galleryLightboxNext: t("galleryLightboxNext"),
              galleryExpand: t("galleryExpand"),
              galleryClickHint: t("galleryClickHint"),
              locationAddressLabel: t("locationAddressLabel"),
              locationRegionLabel: t("locationRegionLabel"),
              kakaoMapEmbedBadge: t("kakaoMapEmbedBadge"),
            }}
          />

          {media.keywordFilter ? (
            <MediaDetailPremiumPoints
              title={t("premiumPointsTitle")}
              items={media.keywordFilter.specialFeature ?? []}
            />
          ) : null}

          {keywordHints.length > 0 ? (
            <section
              aria-labelledby="media-detail-keyword-hints-heading"
              className="mt-8"
            >
              <p
                id="media-detail-keyword-hints-heading"
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-navy/45"
              >
                {t("keywordSearchTagsTitle")}
              </p>
              <div className="flex flex-wrap gap-2">
                {keywordHints.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full border border-navy/14 bg-gradient-to-b from-white to-slate-50 px-3.5 py-1.5 text-xs font-semibold text-navy/88 shadow-sm"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* ── 핵심 지표 카드 그리드 ── */}
          <div className="mb-4 mt-14 flex items-center gap-3">
            <span className="h-5 w-[3px] rounded-full bg-gradient-to-b from-gold to-amber-400" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-navy">
              {t("coreInfoTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* 월 유동인구 — 다크 강조 풀카드 */}
            <div className="col-span-2 flex flex-col rounded-2xl bg-navy px-6 py-6 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                {t("footTrafficTitle")}
              </p>
              <p className="mt-2 text-5xl font-bold tabular-nums sm:text-6xl">
                {monthly.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {t("monthly")} · {t("daily")} {media.dailyFootTraffic.toLocaleString()}
              </p>
            </div>

            {/* 사이즈 */}
            <div className="flex flex-col rounded-2xl bg-slate-800 px-5 py-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                {t("size")}
              </p>
              <p className="mt-auto pt-3 text-lg font-bold leading-snug">
                {media.size || t("empty")}
              </p>
            </div>

            {/* 해상도 */}
            <div className="flex flex-col rounded-2xl bg-slate-800 px-5 py-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                {t("resolution")}
              </p>
              <p className="mt-auto pt-3 text-lg font-bold leading-snug">
                {media.resolution || t("empty")}
              </p>
            </div>

            {/* 가격 — gold 어센트 */}
            <div className="col-span-2 overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-amber-50 via-white to-gold/[0.05]">
              <div className="h-[3px] bg-gradient-to-r from-gold via-amber-400 to-gold/20" />
              <div className="px-6 py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-dark/55">
                  {t("priceTitle")}
                </p>
                <div className="mt-3">
                  {media.keywordFilter ? (
                    <>
                      {hasPriceOptions && primaryPriceOption ? (
                        <p className="text-3xl font-bold tabular-nums text-gold-dark sm:text-4xl">
                          {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                        </p>
                      ) : (
                        <p className="text-2xl font-bold tabular-nums text-gold-dark sm:text-3xl">
                          {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMin)}{" "}~{" "}
                          {formatMediaPriceWonWithSymbol(media.keywordFilter.budgetMax)}
                        </p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-navy">
                        {media.keywordFilter.priceText}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {hasPriceOptions ? t("priceOptionsSummaryHint") : periodLabel}
                      </p>
                    </>
                  ) : hasPriceOptions && primaryPriceOption ? (
                    <>
                      <p className="text-3xl font-bold tabular-nums text-gold-dark sm:text-4xl">
                        {formatCatalogPriceFieldWon(primaryPriceOption.price)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-navy">
                        {primaryPriceOption.label} · {primaryPricePeriodLabel}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("priceOptionsSummaryHint")}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold tabular-nums text-gold-dark sm:text-4xl">
                        {formatCatalogPriceFieldWon(media.price)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("priceUnit")} · {periodLabel}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {hasPriceOptions && priceOptions ? (
            <section
              id="media-detail-price-options"
              aria-labelledby="media-detail-price-options-heading"
              className="-mx-4 mt-14 bg-navy px-4 py-12 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            >
              {/* 섹션 헤더 */}
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-gold/70">
                    PRICING
                  </p>
                  <h2
                    id="media-detail-price-options-heading"
                    className="text-2xl font-bold text-white sm:text-3xl"
                  >
                    {t("priceOptionsSectionTitle")}
                  </h2>
                </div>
                {media.keywordFilter?.priceText ? (
                  <p className="hidden max-w-[45%] text-right text-xs leading-relaxed text-slate-400 sm:block">
                    {media.keywordFilter.priceText}
                  </p>
                ) : null}
              </div>

              {/* 가격 카드 */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {priceOptions.map((opt, idx) => {
                  const periodKey = mediaDetailPricePeriodTranslationKey(
                    (opt.period as string | undefined) ?? media.pricePeriod,
                  );
                  const isFeatured = idx === 0;
                  return (
                    <article
                      key={`${opt.label}-${idx}`}
                      className={
                        isFeatured
                          ? "relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40 ring-1 ring-gold/40 transition-transform duration-300 hover:-translate-y-1"
                          : "flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.11]"
                      }
                    >
                      {isFeatured && (
                        <div className="h-[3px] bg-gradient-to-r from-gold via-amber-400 to-gold/30" />
                      )}
                      <div className="flex flex-1 flex-col p-6">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={
                              isFeatured
                                ? "text-[10px] font-extrabold uppercase tracking-[0.22em] text-gold-dark/80"
                                : "text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/40"
                            }
                          >
                            {opt.label}
                          </h3>
                          {isFeatured && (
                            <span className="shrink-0 rounded-full bg-gold px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-navy">
                              {isKo ? "대표" : "TOP"}
                            </span>
                          )}
                        </div>
                        <p
                          className={
                            isFeatured
                              ? "mt-4 text-4xl font-bold tabular-nums tracking-tight text-navy"
                              : "mt-4 text-4xl font-bold tabular-nums tracking-tight text-white"
                          }
                        >
                          {formatCatalogPriceKrwLong(opt.price, locale)}
                        </p>
                        <span
                          className={
                            isFeatured
                              ? "mt-3 inline-flex w-fit rounded-full bg-navy/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-navy/50"
                              : "mt-3 inline-flex w-fit rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/45"
                          }
                        >
                          {t(periodKey)}
                        </span>
                        <div
                          className={
                            isFeatured
                              ? "mt-5 border-t border-navy/10 pt-5"
                              : "mt-5 border-t border-white/10 pt-5"
                          }
                        >
                          {opt.description?.trim() ? (
                            <p
                              className={
                                isFeatured
                                  ? "text-sm leading-relaxed text-slate-500"
                                  : "text-sm leading-relaxed text-white/45"
                              }
                            >
                              {opt.description}
                            </p>
                          ) : (
                            <p
                              className={
                                isFeatured ? "text-xs text-slate-400" : "text-xs text-white/30"
                              }
                            >
                              {isKo ? "상세 조건은 견적 시 안내드립니다." : "Terms confirmed at quote stage."}
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="mb-5 mt-14 flex items-center gap-3">
            <span className="h-5 w-[3px] rounded-full bg-gradient-to-b from-gold to-amber-400" aria-hidden />
            <h2 className="text-xl font-bold tracking-tight text-navy">
              {t("specsTitle")}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {media.keywordFilter ? (
              <>
                <SpecRow
                  label={t("keywordStatusLabel")}
                  value={media.keywordFilter.status}
                />
                <SpecRow
                  label={t("exposureStyleTitle")}
                  value={media.keywordFilter.exposureTime.join(" · ")}
                />
                <SpecRow
                  label={t("durationOptionsTitle")}
                  value={media.keywordFilter.duration.join(" · ")}
                />
              </>
            ) : null}
            <SpecRow label={t("brightness")} value={media.brightness} />
            {!media.keywordFilter ? (
              <SpecRow
                label={t("operatingHours")}
                value={isKo ? media.operatingHours : media.operatingHoursEn}
              />
            ) : null}
            <SpecRow
              label={t("installYear")}
              value={
                media.installYear
                  ? String(media.installYear)
                  : undefined
              }
            />
            <SpecRow
              label={t("targetAge")}
              value={isKo ? media.targetAge : undefined}
            />
          </div>

          <MediaDetailPerformance metrics={performanceMetrics} />

          <section
            aria-labelledby="media-detail-description-heading"
            className="mt-14 border-t border-navy/10 pt-14 pb-10"
          >
            <div className="mb-10 flex items-center gap-3">
              <span className="h-6 w-[3px] rounded-full bg-gradient-to-b from-gold to-amber-400" aria-hidden />
              <h2
                id="media-detail-description-heading"
                className="text-2xl font-bold tracking-tight text-navy"
              >
                {t("detailDescriptionTitle")}
              </h2>
            </div>
            <div className="space-y-12">
              {overviewBody?.trim() ? (
                <div>
                  <h3 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-navy/35">
                    {t("placementOverviewTitle")}
                  </h3>
                  <div
                    className={[
                      "prose prose-slate max-w-none",
                      "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/88",
                      "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-navy",
                      "prose-strong:font-semibold prose-strong:text-navy",
                    ].join(" ")}
                  >
                    <ProseParagraphs text={overviewBody} />
                  </div>
                </div>
              ) : null}
              <div>
                <h3 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-navy/35">
                  {t("historyTitle")}
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/88",
                    "prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-navy",
                    "prose-strong:font-semibold prose-strong:text-navy",
                  ].join(" ")}
                >
                  <ProseParagraphs
                    text={
                      (isKo
                        ? media.advertiserHistory
                        : media.advertiserHistoryEn) || t("empty")
                    }
                  />
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-navy/35">
                  {t("nearbyTitle")}
                </h3>
                <div
                  className={[
                    "prose prose-slate max-w-none",
                    "prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/88",
                    "prose-headings:font-bold prose-headings:text-navy",
                    "prose-strong:font-semibold prose-strong:text-navy",
                  ].join(" ")}
                >
                  <ProseParagraphs
                    text={
                      (isKo ? media.nearbyFacilities : media.nearbyFacilitiesEn) ||
                      t("empty")
                    }
                  />
                </div>
              </div>
              {featuresText ? (
                <EffectMemoCallout title={t("effectMemoTitle")}>
                  <div
                    className={[
                      "prose prose-slate max-w-none",
                      "prose-p:mt-0 prose-p:text-[15px] prose-p:leading-[1.8] prose-p:text-navy/90",
                      "prose-strong:font-semibold prose-strong:text-navy",
                    ].join(" ")}
                  >
                    <ProseParagraphs text={featuresText} />
                  </div>
                </EffectMemoCallout>
              ) : null}
            </div>
          </section>

          {caseStudyItems.length > 0 ? (
            <>
              <div className="mb-4 mt-14 flex items-center gap-3">
                <span className="h-5 w-[3px] rounded-full bg-gradient-to-b from-gold to-amber-400" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight text-navy">
                  {t("caseStudiesTitle")}
                </h2>
              </div>
              <MediaCaseStudyGallery
                photos={caseStudyItems}
                isKo={isKo}
                labels={{
                  close: t("galleryLightboxClose"),
                  prev: t("galleryLightboxPrev"),
                  next: t("galleryLightboxNext"),
                  expand: t("galleryExpand"),
                  clickHint: t("galleryClickHint"),
                }}
              />
            </>
          ) : null}

          <MediaSimilarCarousel items={similar} isKo={isKo} title={t("similarTitle")} />
        </div>
      </section>

      <MediaDetailStickyCta media={media} compareHref={compareHref} />
    </>
  );
}

function ProseParagraphs({ text }: { text: string }) {
  const normalized = text.trim();
  if (!normalized) {
    return null;
  }
  const blocks = normalized.split(/\n\s*\n/).filter(Boolean);
  if (blocks.length <= 1) {
    return <p>{normalized}</p>;
  }
  return (
    <>
      {blocks.map((block, i) => (
        <p key={i}>{block.replace(/\s*\n\s*/g, " ").trim()}</p>
      ))}
    </>
  );
}

function EffectMemoCallout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-md shadow-navy/[0.06]">
      <div className="h-[3px] bg-gradient-to-r from-gold via-amber-400 to-gold/20" />
      <div className="flex gap-4 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-dark">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold-dark/80">
            {title}
          </p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CoreFact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-dark"
        aria-hidden
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-navy/40">
          {label}
        </p>
        <div className="mt-1.5 min-w-0 text-sm leading-relaxed text-navy">
          {value}
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-navy/8 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-navy/35">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
