import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  buildCaseStudyGalleryItems,
  getMediaDetailGalleryUrls,
  getPrimaryMediaImageUrl,
  buildSimilarSortCatalog,
  getSimilarMediaFromCatalog,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemToRecentlyViewedRecord } from "@/lib/recently-viewed";
import {
  buildMediaMetaDescription,
  buildMediaMetaKeywordsList,
  buildMediaPageTitle,
} from "@/lib/media-seo";
import { attachRecommendReason } from "@/lib/media-recommend-reasons";
import { buildMediaImageAlt } from "@/lib/media-image-seo";
import {
  buildShareMetadata,
  mediaDetailShareImages,
  pageAlternates,
} from "@/lib/seo";
import {
  buildMediaDetailSeoLinks,
  SeoContextualLinks,
} from "@/components/seo/seo-contextual-links";
import {
  buildMediaBreadcrumbJsonLd,
  buildMediaPlaceJsonLd,
  buildMediaProductJsonLd,
} from "@/lib/structured-data";
import {
  getAllKeywordFilterMediaIds,
  getSimilarKeywordFilterMediaItems,
  heroTagCandidatesFromKeyword,
  pickSearchKeywordHints,
} from "@/lib/keyword-filter-media-detail";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { mediaDetailPricePeriodTranslationKey } from "@/lib/media-price-format";
import MediaCaseStudyGallery from "@/components/media-case-study-gallery";
import { RelatedCases } from "@/components/media-detail/related-cases";
import { getSuccessCasesForMedia } from "@/lib/public-content-queries";
import {
  fetchPublicMediaCatalog,
  getMediaSlugsForStaticBuild,
  resolveMediaForDetail,
} from "@/lib/public-media-catalog";
import { enrichMediaWithTrust } from "@/lib/media-trust-catalog";
import { attachReviewStatsToMediaItems } from "@/lib/media-reviews";
import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import {
  buildMediaAnalyticsReport,
  buildMediaAnalyticsReportFused,
  type MediaAnalyticsReport,
} from "@/lib/media-report-analytics";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import { MediaReviewsSection } from "@/components/media-detail/media-reviews-section";
import TrackMediaView from "@/components/track-media-view";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { MediaDetailPageView } from "@/components/media-detail/media-detail-page-view";
import MediaDetailPremiumPoints from "@/components/media-detail-premium-points";
import { getMediaRecentBrands } from "@/lib/insights/media-recent-brands";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import {
  mediaItemDetailPath,
  shouldRedirectMediaIdToSlug,
} from "@/lib/media-slug";
import { deferCatalogLandingStaticGeneration } from "@/lib/vercel-static-build";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const maxDuration = 60;

export async function generateStaticParams() {
  if (deferCatalogLandingStaticGeneration()) return [];
  const vercelLimit = Number(process.env.MEDIA_STATIC_BUILD_LIMIT ?? 0);
  const slugLimit =
    process.env.VERCEL === "1" && vercelLimit > 0 ? vercelLimit : undefined;
  const slugs = await getMediaSlugsForStaticBuild(slugLimit);
  const keywordIds = getAllKeywordFilterMediaIds().map(String);
  const merged = [...new Set([...slugs, ...keywordIds])];
  return merged.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { slug } = await params;
  const media = await resolveMediaForDetail(slug);
  if (!media) return { title: "Media" };
  const title = buildMediaPageTitle(media, locale);
  const description = buildMediaMetaDescription(media, locale);
  const keywords = buildMediaMetaKeywordsList(media, locale, 28);

  const imageAlt = buildMediaImageAlt(media, locale);
  const ogImages = mediaDetailShareImages(
    locale,
    String(media.id),
    getPrimaryMediaImageUrl(media),
    { ko: imageAlt, en: imageAlt },
  );
  const canonicalPath = mediaItemDetailPath(media);
  return {
    title,
    description,
    keywords,
    alternates: pageAlternates(locale, canonicalPath),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: canonicalPath,
      type: "website",
      alt: { ko: imageAlt, en: imageAlt },
      images: ogImages,
    }),
  };
}

export default async function MediaDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { slug: slugParam } = await params;
  let media = await resolveMediaForDetail(slugParam);
  if (!media) notFound();

  if (shouldRedirectMediaIdToSlug(slugParam, media)) {
    permanentRedirect(`/${locale}${mediaItemDetailPath(media)}`);
  }
  try {
    [media] = await attachReviewStatsToMediaItems([media]);
  } catch (e) {
    console.error("[media-detail] review stats failed", media.id, e);
  }
  try {
    media = await enrichMediaWithTrust(media);
  } catch (e) {
    console.error("[media-detail] trust enrich failed", media.id, e);
  }

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch (e) {
    console.error("[media-detail] catalog fetch failed", media.id, e);
  }

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("[media-detail] session lookup failed", e);
  }
  const detailAccess = await checkReportAccess(user?.id ?? null, "detail_data");
  const competitorAccess = await checkReportAccess(user?.id ?? null, "competitor");
  let analyticsReport: MediaAnalyticsReport;
  try {
    analyticsReport = await buildMediaAnalyticsReportFused(
      media,
      catalog,
      media.trafficPattern ?? null,
    );
  } catch (e) {
    console.error("[media-detail] fused analytics failed", media.id, e);
    analyticsReport = buildMediaAnalyticsReport(
      media,
      catalog,
      media.trafficPattern ?? null,
    );
  }
  let relatedCases: Awaited<ReturnType<typeof getSuccessCasesForMedia>> = [];
  try {
    relatedCases = await getSuccessCasesForMedia(media.id, 6, locale, {
      location: media.location,
      locationEn: media.locationEn,
      district: media.district,
      region: media.region,
      name: media.name,
      nearbyStations: media.nearbyStations,
      nearbyLandmarks: media.nearbyLandmarks,
    });
  } catch (e) {
    console.error("[media-detail] related cases failed", media.id, e);
  }
  const t = await getTranslations({ locale, namespace: "media.detail" });
  const tMedia = await getTranslations({ locale, namespace: "media" });
  const isKo = locale === "ko";
  const recentBrands = await getMediaRecentBrands(media.id, media.region, isKo);
  const periodLabel = t(
    mediaDetailPricePeriodTranslationKey(media.pricePeriod),
  );

  const priceOptions = Array.isArray(media.priceOptions)
    ? media.priceOptions
    : undefined;
  const hasPriceOptions = Boolean(priceOptions && priceOptions.length > 0);
  const primaryPriceOption = priceOptions?.[0];

  const similarRaw = media.keywordFilter
    ? getSimilarKeywordFilterMediaItems(media.id, 4)
    : getSimilarMediaFromCatalog(catalog, media, 4);
  const similar = attachRecommendReason(similarRaw, "similar_profile", locale);
  const similarSortCatalog = media.keywordFilter
    ? undefined
    : buildSimilarSortCatalog(catalog, media);
  const galleryImages = getMediaDetailGalleryUrls(media);
  const heroImage = galleryImages[0] ?? "";
  const caseStudyItems = buildCaseStudyGalleryItems(media);
  const typeLabel =
    (isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en) ?? "";
  const featuresText = isKo ? media.features : media.featuresEn;
  const performanceMetrics = resolvePerformanceMetrics(media);

  const regionDisplay = (() => {
    switch (media.region) {
      case "seoul":
        return tMedia("regions.seoul");
      case "busan":
        return tMedia("regions.busan");
      case "jeju":
        return tMedia("regions.jeju");
      case "national":
        return tMedia("regions.national");
      default:
        return media.region;
    }
  })();

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
    const desc = (isKo ? media.description : (media.descriptionEn || media.description))?.trim();
    return desc ?? "";
  })();

  const imageAlt = buildMediaImageAlt(media, locale);
  const seoContextPills = buildMediaDetailSeoLinks(media, locale);

  const placeJsonLd = buildMediaPlaceJsonLd(media, locale);
  const productJsonLd = buildMediaProductJsonLd(media, locale);
  const breadcrumbJsonLd = buildMediaBreadcrumbJsonLd(media, locale);

  return (
    <>
      <TrackMediaView
        record={mediaItemToRecentlyViewedRecord(media, { isKo })}
        offlineCard={{
          id: media.id,
          name: isKo ? media.name : media.nameEn || media.name,
          location: formatMediaLocationShort(media, isKo),
          type: typeLabel,
          price: media.price,
          imageUrl: heroImage || undefined,
        }}
      />
      <script
        type="application/ld+json"
        // SEO: Place + BreadcrumbList JSON-LD. dangerouslySetInnerHTML 는
        // 매체 데이터에서 생성된 안전한 객체이므로 XSS 위험 없음.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([placeJsonLd, productJsonLd, breadcrumbJsonLd]),
        }}
      />

      <MediaDetailPageView
        media={media}
        similarSortCatalog={similarSortCatalog}
        locale={locale}
        isKo={isKo}
        typeLabel={typeLabel}
        heroTags={heroTags}
        galleryImages={galleryImages}
        heroImage={heroImage}
        imageAlt={imageAlt}
        performanceMetrics={performanceMetrics}
        analyticsReport={analyticsReport}
        detailAccess={detailAccess}
        competitorAccess={competitorAccess}
        recentBrands={recentBrands}
        similar={similar}
        hasPriceOptions={hasPriceOptions}
        priceOptions={priceOptions}
        primaryPriceOption={primaryPriceOption}
        featuresText={featuresText}
        regionDisplay={regionDisplay}
        periodLabel={periodLabel}
        instantBookingEligible={isInstantBookingEligible(media).eligible}
        labels={{
          back: t("back"),
          priceTitle: t("priceTitle"),
          inquiry: t("inquiry"),
          quote: t("quote"),
          visibilityBadge: t("visibilityBadge", {
            score: performanceMetrics.visibilityScore,
          }),
          kpiExposure: t("heroKpiExposure"),
          kpiCpm: t("heroKpiCpm"),
          kpiVisibility: t("heroKpiVisibility"),
          tabs: {
            location: t("tabs.location"),
            traffic: t("tabs.traffic"),
            calendar: t("tabs.calendar"),
            execution: t("tabs.execution"),
          },
          execution: {
            size: t("size"),
            resolution: t("resolution"),
            brightness: t("brightness"),
            operatingHours: t("operatingHours"),
            installYear: t("installYear"),
            targetAge: t("targetAge"),
            empty: t("empty"),
            processTitle: t("executionProcess"),
            noticesTitle: t("executionNotices"),
            specsTitle: t("specsTitle"),
            periodLabel,
          },
          gallery: {
            close: t("galleryLightboxClose"),
            prev: t("galleryLightboxPrev"),
            next: t("galleryLightboxNext"),
            expand: t("galleryExpand"),
            clickHint: t("galleryClickHint"),
          },
          similarTitle: media.keywordFilter ? t("similarTitle") : t("viewedAlsoTitle"),
        }}
        belowFold={
          <>
            {media.keywordFilter ? (
              <MediaDetailPremiumPoints
                title={t("premiumPointsTitle")}
                items={media.keywordFilter.specialFeature ?? []}
              />
            ) : null}

            {keywordHints.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keywordHints.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full border dark:border-white/12 border-gray-200 px-3 py-1 text-xs font-semibold dark:text-white/70 text-gray-600"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : null}

            {overviewBody?.trim() ? (
              <details className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white p-4">
                <summary className="cursor-pointer font-semibold dark:text-white text-gray-900">
                  {t("overviewAccordion")}
                </summary>
                <div className="mt-3 text-sm leading-relaxed dark:text-white/75 text-gray-700">
                  <ProseParagraphs text={overviewBody} />
                </div>
              </details>
            ) : null}

            {relatedCases.length > 0 ? (
              <RelatedCases cases={relatedCases} isKo={isKo} />
            ) : null}

            {caseStudyItems.length > 0 ? (
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
            ) : null}

            {!media.keywordFilter ? (
              <MediaReviewsSection
                mediaId={media.id}
                mediaName={isKo ? media.name : media.nameEn || media.name}
              />
            ) : null}

            {seoContextPills.length > 0 ? (
              <SeoContextualLinks
                title={isKo ? "관련 SEO 가이드" : "Related guides"}
                pills={seoContextPills}
              />
            ) : null}
          </>
        }
      />
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

