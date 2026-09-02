import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  buildCaseStudyGalleryItems,
  getMediaDetailGalleryUrls,
  getSimilarMediaFromCatalog,
} from "@/lib/media-data";
import { resolveMediaDisplayPill } from "@/lib/media-display-labels";
import { mediaItemToRecentlyViewedRecord } from "@/lib/recently-viewed";
import { buildMediaMetaKeywordsList } from "@/lib/media-seo";
import { attachRecommendReason } from "@/lib/media-recommend-reasons";
import { buildMediaImageAlt } from "@/lib/media-image-seo";
import {
  buildMediaOgDescription,
  buildMediaOgShortDescription,
  buildMediaOgTitle,
  resolveMediaOgImageUrl,
} from "@/lib/media-og-metadata";
import { pageAlternates, siteNameForLocale } from "@/lib/seo";
import {
  buildMediaDetailSeoLinks,
  SeoContextualLinks,
} from "@/components/seo/seo-contextual-links";
import {
  buildMediaBreadcrumbJsonLd,
  buildMediaPlaceJsonLd,
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
  getMediaSlugsForStaticBuild,
  resolveMediaForDetail,
} from "@/lib/public-media-catalog";
import { fetchSimilarMediaPeers } from "@/lib/media-similar-peers";
import { enrichMediaWithTrust } from "@/lib/media-trust-catalog";
import {
  attachReviewStatsToMediaItems,
  fetchMediaReviewsInitialStats,
} from "@/lib/media-reviews";
import {
  buildMediaAnalyticsReport,
  buildMediaAnalyticsReportFused,
  type MediaAnalyticsReport,
} from "@/lib/media-report-analytics";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import { MediaReviewsSection } from "@/components/media-detail/media-reviews-section";
import TrackMediaView from "@/components/track-media-view";
import { EventOnMount } from "@/components/analytics/event-on-mount";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { MediaDetailPageView } from "@/components/media-detail/media-detail-page-view";
import { MediaDetailOverviewSection } from "@/components/media-detail/media-detail-overview-section";
import MediaDetailPremiumPoints from "@/components/media-detail-premium-points";
import { getMediaRecentBrands } from "@/lib/insights/media-recent-brands";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";
import { isAvailabilityDataSparse } from "@/lib/media-availability-coverage";
import { activeBookingWhere } from "@/lib/booking-conflict";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  mediaItemDetailPath,
  shouldRedirectMediaIdToSlug,
} from "@/lib/media-slug";
import { deferCatalogLandingStaticGeneration } from "@/lib/vercel-static-build";
import { ExitSurveyBanner } from "@/components/exit-survey-banner";
import { formatSizeDisplayOptional } from "@/lib/format-media-size";

type Props = { params: Promise<{ locale: string; slug: string }> };

/** 7일 ISR. 어드민 저장 시 revalidateMediaCaches로 즉시 반영. */
export const revalidate = 604800;
export const dynamicParams = true;
export const maxDuration = 60;

/**
 * Vercel 빌드에서 사전 생성할 인기 상위 매체 수 (기본값).
 *
 * 각 상세 페이지는 빌드 시 다수의 DB/외부 호출로 렌더가 무겁다(관측상 페이지당
 * 최대 60s+). Vercel 은 cpus=1 로 직렬 생성하므로, 기본값을 과도하게 잡으면
 * 45분 빌드 한도를 넘길 수 있다. 따라서 기본은 build-safe 한 소수(24)로 두고,
 * 빌드 여유가 확인되면 `MEDIA_STATIC_BUILD_LIMIT`(예: 50~100)로 상향한다.
 * 0 으로 두면 사전 생성 없이 전량 on-demand ISR(revalidate=86400).
 */
const MEDIA_DETAIL_STATIC_TOP_N = 24;

export async function generateStaticParams() {
  const envLimit = Number(process.env.MEDIA_STATIC_BUILD_LIMIT ?? 0);
  const onVercel = deferCatalogLandingStaticGeneration();
  // Vercel: 인기 상위 N개만 사전 생성(warm) + 나머지는 on-demand ISR(revalidate=86400).
  // 로컬/CI(비 Vercel): 전량 사전 생성(기존 동작 유지).
  const slugLimit = onVercel
    ? envLimit > 0
      ? envLimit
      : MEDIA_DETAIL_STATIC_TOP_N
    : process.env.VERCEL === "1" && envLimit > 0
      ? envLimit
      : undefined;
  if (onVercel && slugLimit === 0) return [];
  const slugs = await getMediaSlugsForStaticBuild(slugLimit);
  const keywordIds = getAllKeywordFilterMediaIds().map(String);
  const merged = [...new Set([...slugs, ...keywordIds])];
  return merged.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { slug } = await params;
  const media = await resolveMediaForDetail(slug).catch(() => null);
  if (!media) return {};

  const ogImage = resolveMediaOgImageUrl(media);
  const title = buildMediaOgTitle(media, locale);
  const description = buildMediaOgDescription(media, locale);
  const ogDescription = buildMediaOgShortDescription(media, locale);
  const keywords = buildMediaMetaKeywordsList(media, locale, 28);
  const imageAlt = buildMediaImageAlt(media, locale);
  const canonicalPath = mediaItemDetailPath(media);
  const displayName =
    locale === "ko" || locale.startsWith("ko")
      ? media.name
      : media.nameEn || media.name;

  return {
    title,
    description,
    keywords,
    alternates: pageAlternates(locale, canonicalPath),
    openGraph: {
      title: displayName,
      description: ogDescription,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
      type: "website",
      siteName: siteNameForLocale(locale),
    },
    twitter: {
      card: "summary_large_image",
      title: displayName,
      description: ogDescription,
      images: [ogImage],
    },
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
  const mediaId = media.id;
  const similarPeersPromise = media.keywordFilter
    ? Promise.resolve([])
    : fetchSimilarMediaPeers(media, { limit: 64 }).catch((e) => {
        console.error("[media-detail] similar peers failed", mediaId, e);
        return [];
      });

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

  const similarPeers = await similarPeersPromise;

  let analyticsReport: MediaAnalyticsReport;
  try {
    analyticsReport = await buildMediaAnalyticsReportFused(
      media,
      similarPeers,
      media.trafficPattern ?? null,
    );
  } catch (e) {
    console.error("[media-detail] fused analytics failed", media.id, e);
    analyticsReport = buildMediaAnalyticsReport(
      media,
      similarPeers,
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

  let reviewInitialStats: Awaited<
    ReturnType<typeof fetchMediaReviewsInitialStats>
  > | null = null;
  if (!media.keywordFilter) {
    try {
      reviewInitialStats = await fetchMediaReviewsInitialStats(media.id);
    } catch (e) {
      console.error("[media-detail] review prefetch failed", media.id, e);
    }
  }

  let blockingBookingCount = 0;
  if (!media.keywordFilter && isDatabaseConfigured()) {
    try {
      blockingBookingCount = await getPrisma().mediaBooking.count({
        where: {
          mediaId: media.id,
          ...activeBookingWhere(),
        },
      });
    } catch (e) {
      console.error("[media-detail] booking coverage failed", media.id, e);
    }
  }
  const availabilitySparse = isAvailabilityDataSparse(blockingBookingCount);

  const priceOptions = Array.isArray(media.priceOptions)
    ? media.priceOptions
    : undefined;
  const hasPriceOptions = Boolean(priceOptions && priceOptions.length > 0);
  const primaryPriceOption = priceOptions?.[0];

  const similarRaw = media.keywordFilter
    ? getSimilarKeywordFilterMediaItems(media.id, 4)
    : getSimilarMediaFromCatalog(similarPeers, media, 4);
  const similar = attachRecommendReason(similarRaw, "similar_profile", locale);
  const similarSortCatalog = media.keywordFilter ? undefined : similarPeers;
  const galleryImages = getMediaDetailGalleryUrls(media);
  const heroImage = galleryImages[0] ?? "";
  const caseStudyItems = buildCaseStudyGalleryItems(media);
  const typeLabel = resolveMediaDisplayPill(media, isKo ? "ko" : "en");
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

  const heroSizeTag = formatSizeDisplayOptional(media);
  /** 히어로 요약 pill — 크기·유형·타깃 최대 3개 (상세 스펙은 집행 탭) */
  const heroTargetTag = media.targetAge?.trim()
    ? media.targetAge.trim().length > 28
      ? `${media.targetAge.trim().slice(0, 26)}…`
      : media.targetAge.trim()
    : null;
  const heroTags = (
    media.keywordFilter
      ? heroTagCandidatesFromKeyword(
          media.keywordFilter,
          heroSizeTag ?? media.size,
        )
      : [heroSizeTag, typeLabel, heroTargetTag]
  )
    .filter((x): x is string => Boolean(x && String(x).trim()))
    .slice(0, 3);

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
  const breadcrumbJsonLd = buildMediaBreadcrumbJsonLd(media, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([placeJsonLd, breadcrumbJsonLd]),
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
        recentBrands={recentBrands}
        similar={similar}
        hasPriceOptions={hasPriceOptions}
        priceOptions={priceOptions}
        primaryPriceOption={primaryPriceOption}
        featuresText={featuresText}
        regionDisplay={regionDisplay}
        periodLabel={periodLabel}
        instantBookingEligible={isInstantBookingEligible(media).eligible}
        availabilitySparse={availabilitySparse}
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
              <MediaDetailOverviewSection
                title={t("overviewAccordion")}
                body={overviewBody}
                isKo={isKo}
              />
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
                initialStats={reviewInitialStats ?? undefined}
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
      <EventOnMount
        event="view_media"
        params={{ media_id: media.id, media_name: media.name, media_type: media.type }}
      />
      <ExitSurveyBanner surface="media_detail" />
    </>
  );
}
