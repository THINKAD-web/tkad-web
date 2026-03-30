import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  CircleDollarSign,
  MapPin,
  Monitor,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAllMediaIds,
  getMediaDetailGalleryUrls,
  getSimilarMediaFromCatalog,
  typeLabels,
} from "@/lib/media-data";
import { fetchPublicMediaCatalog, resolveMediaForDetail } from "@/lib/public-media-catalog";
import { resolvePerformanceMetrics } from "@/lib/media-performance";
import MediaDetailExtras from "@/components/media-detail-extras";
import MediaDetailHeroGallery from "@/components/media-detail-hero-gallery";
import MediaCaseStudyGallery from "@/components/media-case-study-gallery";
import MediaDetailPerformance from "@/components/media-detail-performance";
import MediaDetailStickyCta from "@/components/media-detail-sticky-cta";
import MediaSimilarCarousel from "@/components/media-similar-carousel";
import MediaDetailAdminActions from "@/components/media-detail-admin-actions";
import TrackMediaView from "@/components/track-media-view";
import { resolveLocaleParam } from "@/lib/resolve-locale";

type Props = { params: Promise<{ locale: string; id: string }> };

export const revalidate = 120;

export function generateStaticParams() {
  return getAllMediaIds().map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const media = await resolveMediaForDetail(id);
  if (!media) return { title: "Media" };
  const title =
    locale === "ko" ? `${media.name} | THINKAD` : `${media.nameEn} | THINKAD`;
  const description =
    locale === "ko"
      ? `${media.location} · 월 ₩${media.price.toLocaleString()}만원`
      : `${media.locationEn} · ₩${media.price.toLocaleString()}M/mo`;
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

  const monthly =
    media.monthlyFootTraffic ??
    Math.round(media.dailyFootTraffic * 30);

  const similar = getSimilarMediaFromCatalog(catalog, media, 4);
  const casePhotos = media.caseStudyPhotos ?? [];
  const galleryImages = getMediaDetailGalleryUrls(media);
  const heroImage = galleryImages[0] ?? "";
  const extraGalleryImages = galleryImages.slice(1);
  const typeLabel =
    (isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en) ?? "";
  const featuresText = isKo ? media.features : media.featuresEn;
  const performanceMetrics = resolvePerformanceMetrics(media);
  const compareHref =
    similar.length > 0
      ? `/compare?ids=${media.id},${similar[0].id}`
      : "/media";

  return (
    <>
      <TrackMediaView mediaId={media.id} />
      <section className="relative w-full bg-navy">
        {/* 대표 이미지 1장 */}
        {heroImage && (
          <div className="relative aspect-video w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={isKo ? media.name : media.nameEn}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent" />
          </div>
        )}
        <div className="relative px-4 py-6 sm:px-6 sm:py-8 lg:px-12 lg:py-10" style={heroImage ? { marginTop: '-6rem' } : {}}>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <Link href="/media">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-white/85 hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t("back")}
              </Button>
            </Link>
            <MediaDetailAdminActions />
          </div>
          <div className="max-w-4xl min-w-0 pb-1 mt-4">
            <h1 className="break-words text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl md:text-4xl">
              {isKo ? media.name : media.nameEn}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-white/88 sm:text-lg">
              <span className="inline-flex items-center gap-2">
                <MapPin
                  className="h-4 w-4 shrink-0 opacity-90"
                  aria-hidden
                />
                {isKo ? media.location : media.locationEn}
              </span>
              {typeLabel ? (
                <>
                  <span
                    className="hidden text-white/35 sm:inline"
                    aria-hidden
                  >
                    ·
                  </span>
                  <span className="font-medium text-white/95">{typeLabel}</span>
                </>
              ) : null}
            </p>
            <div className="mt-5 flex min-w-0 max-w-full flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2 sm:gap-y-1">
              <span className="break-words text-xl font-bold tabular-nums text-gold sm:text-2xl">
                ₩{media.price.toLocaleString()}
              </span>
              <span className="text-sm font-normal text-white/70 sm:shrink-0">
                {t("perMonth")}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 pb-28 sm:pb-32">
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

          <h2 className="mb-4 mt-12 text-lg font-bold text-navy">
            {t("coreInfoTitle")}
          </h2>
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-lg shadow-navy/5 sm:p-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
              <CoreFact
                icon={Ruler}
                label={t("size")}
                value={
                  <span className="font-semibold">
                    {media.size || t("empty")}
                  </span>
                }
              />
              <CoreFact
                icon={Monitor}
                label={t("resolution")}
                value={
                  <span className="font-semibold">
                    {media.resolution || t("empty")}
                  </span>
                }
              />
              <CoreFact
                icon={CircleDollarSign}
                label={t("priceTitle")}
                value={
                  <>
                    <span className="break-all text-base font-semibold tabular-nums text-gold-dark sm:text-lg">
                      ₩{media.price.toLocaleString()}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {t("priceUnit")}
                    </span>
                  </>
                }
              />
              <CoreFact
                icon={Users}
                label={t("footTrafficTitle")}
                value={
                  <>
                    <span className="block text-lg font-bold leading-tight text-navy sm:text-xl">
                      {monthly.toLocaleString()}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                      {t("monthly")}
                    </span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {t("daily")}{" "}
                      {media.dailyFootTraffic.toLocaleString()}
                    </span>
                  </>
                }
              />
            </div>
          </div>

          <h2 className="mb-4 mt-12 text-lg font-bold text-navy">
            {t("specsTitle")}
          </h2>
          <dl className="grid gap-3 rounded-xl border bg-white p-6 sm:grid-cols-2">
            <SpecRow label={t("brightness")} value={media.brightness} />
            <SpecRow
              label={t("operatingHours")}
              value={isKo ? media.operatingHours : media.operatingHoursEn}
            />
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
          </dl>

          <MediaDetailPerformance metrics={performanceMetrics} />

          <section
            aria-labelledby="media-detail-description-heading"
            className="mt-10 border-t border-navy/10 py-12"
          >
            <h2
              id="media-detail-description-heading"
              className="mb-10 text-xl font-bold tracking-tight text-navy sm:text-2xl"
            >
              {t("detailDescriptionTitle")}
            </h2>
            <div className="space-y-12">
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

          {(casePhotos.length > 0 || extraGalleryImages.length > 0) && (
            <>
              <h2 className="mb-4 mt-12 text-lg font-bold text-navy">
                {t("caseStudiesTitle")}
              </h2>
              <MediaCaseStudyGallery
                photos={[
                  ...extraGalleryImages.map((url) => ({ url })),
                  ...casePhotos,
                ]}
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
          )}

          <MediaSimilarCarousel
            items={similar}
            isKo={isKo}
            title={t("similarTitle")}
            priceSuffix={isKo ? "만원/월" : " (10K ₩)/mo"}
          />
        </div>
      </section>

      <MediaDetailStickyCta mediaId={media.id} compareHref={compareHref} />
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
    <div className="relative overflow-hidden rounded-2xl border border-gold-dark/45 bg-gradient-to-br from-gold-light/50 via-white to-gold/18 px-5 py-6 shadow-md shadow-navy/[0.07] ring-1 ring-inset ring-white/60 sm:px-8 sm:py-7">
      <div
        className="pointer-events-none absolute inset-y-5 left-0 w-1 rounded-full bg-gradient-to-b from-gold-dark/75 to-gold-dark/20"
        aria-hidden
      />
      <div className="relative flex gap-4 pl-3 sm:pl-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/[0.07] text-gold-dark">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-navy/75">
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
    <div className="flex gap-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold-dark"
        aria-hidden
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <div className="mt-2 min-w-0 text-sm leading-relaxed text-navy">
          {value}
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}
