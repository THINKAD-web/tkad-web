import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  buildSimilarSortCatalog,
  getSimilarMediaFromCatalog,
  getMediaDetailGalleryUrls,
} from "@/lib/media-data";
import { mediaItemToRecentlyViewedRecord } from "@/lib/recently-viewed";
import { buildMediaImageAlt } from "@/lib/media-image-seo";
import {
  buildMediaOgDescription,
  buildMediaOgShortDescription,
  buildMediaOgTitle,
  resolveMediaOgImageUrl,
} from "@/lib/media-og-metadata";
import { pageAlternates } from "@/lib/seo";
import {
  buildMediaBreadcrumbJsonLd,
  buildMediaPlaceJsonLd,
} from "@/lib/structured-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { mediaDetailPricePeriodTranslationKey } from "@/lib/media-price-format";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { getCurrentUser } from "@/lib/user-session";
import { checkReportAccess } from "@/lib/report-access";
import {
  buildMediaAnalyticsReport,
  buildMediaAnalyticsReportFused,
} from "@/lib/media-report-analytics";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import TrackMediaView from "@/components/track-media-view";
import { EventOnMount } from "@/components/analytics/event-on-mount";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { MediaDetailPageView } from "@/components/media-detail/media-detail-page-view";
import { attachRecommendReason } from "@/lib/media-recommend-reasons";
import { resolveNetworkMediaDetail } from "@/lib/media-network-public";
import {
  networkDetailTypeLabel,
  networkRowToDetailMediaItem,
} from "@/lib/network-media-detail";
import { mediaItemDetailPath } from "@/lib/media-slug";
import { ExitSurveyBanner } from "@/components/exit-survey-banner";
import { getMediaRecentBrands } from "@/lib/insights/media-recent-brands";

type Props = { params: Promise<{ locale: string; id: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const row = await resolveNetworkMediaDetail(id).catch(() => null);
  if (!row) return {};

  const media = networkRowToDetailMediaItem(row);
  const ogImage = resolveMediaOgImageUrl(media);
  const title = buildMediaOgTitle(media, locale);
  const description = buildMediaOgDescription(media, locale);
  const ogDescription = buildMediaOgShortDescription(media, locale);
  const canonicalPath = mediaItemDetailPath(media);

  return {
    title,
    description,
    alternates: pageAlternates(locale, canonicalPath),
    openGraph: {
      title: media.name,
      description: ogDescription,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: media.name,
      description: ogDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function MediaNetworkDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id } = await params;

  const row = await resolveNetworkMediaDetail(id);
  if (!row) notFound();

  const media = networkRowToDetailMediaItem(row);
  const isKo = locale === "ko";

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch (e) {
    console.error("[network-detail] catalog fetch failed", e);
  }

  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    /* ignore */
  }

  const detailAccess = await checkReportAccess(user?.id ?? null, "detail_data");
  const competitorAccess = await checkReportAccess(
    user?.id ?? null,
    "competitor",
  );

  let analyticsReport;
  try {
    analyticsReport = await buildMediaAnalyticsReportFused(
      media,
      catalog,
      media.trafficPattern ?? null,
    );
  } catch {
    analyticsReport = buildMediaAnalyticsReport(
      media,
      catalog,
      media.trafficPattern ?? null,
    );
  }

  const t = await getTranslations({ locale, namespace: "media.detail" });
  const tMedia = await getTranslations({ locale, namespace: "media" });
  const recentBrands = await getMediaRecentBrands(media.id, media.region, isKo);
  const periodLabel = t(mediaDetailPricePeriodTranslationKey(media.pricePeriod));

  const priceOptions = Array.isArray(media.priceOptions)
    ? media.priceOptions
    : undefined;
  const hasPriceOptions = Boolean(priceOptions && priceOptions.length > 0);
  const primaryPriceOption = priceOptions?.[0];

  const similarRaw = getSimilarMediaFromCatalog(catalog, media, 4);
  const similar = attachRecommendReason(similarRaw, "similar_profile", locale);
  const similarSortCatalog = buildSimilarSortCatalog(catalog, media);

  const galleryImages = getMediaDetailGalleryUrls(media);
  const heroImage = galleryImages[0] ?? "";
  const typeLabel = networkDetailTypeLabel(row.type, isKo);
  const featuresText = isKo ? media.features : media.featuresEn;
  const performanceMetrics = resolvePerformanceMetrics(media);

  const regionDisplay = (() => {
    if (row.regions.length > 0) return row.regions.join(", ");
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

  const totalUnits = row.locations.reduce(
    (s, l) => s + (l.unitCount ?? 1),
    0,
  );
  const heroTags = [
    typeLabel,
    row.totalLocations > 0
      ? `${row.totalLocations.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "개소" : " sites"}`
      : null,
    totalUnits > row.locations.length
      ? `${isKo ? "총 " : ""}${totalUnits.toLocaleString(isKo ? "ko-KR" : "en-US")}${isKo ? "구좌" : " units"}`
      : null,
    media.targetAge,
  ].filter((x): x is string => Boolean(x && String(x).trim()));

  const overviewBody =
    row.description?.trim() ||
    row.features?.trim() ||
    media.catalogDescription?.trim() ||
    "";

  const imageAlt = buildMediaImageAlt(media, locale);
  const placeJsonLd = buildMediaPlaceJsonLd(media, locale);
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
      <EventOnMount
        event="view_media"
        params={{ media_id: media.id, media_name: media.name, media_type: "network" }}
      />
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
        instantBookingEligible={false}
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
          similarTitle: t("viewedAlsoTitle"),
        }}
        belowFold={
          overviewBody ? (
            <details className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                {t("overviewAccordion")}
              </summary>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-white/75">
                {overviewBody}
              </div>
            </details>
          ) : null
        }
      />
      <ExitSurveyBanner surface="media_detail" />
    </>
  );
}
