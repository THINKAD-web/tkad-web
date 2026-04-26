import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import {
  buildMediaPlaceJsonLd,
  buildMediaBreadcrumbJsonLd,
} from "@/lib/structured-data";
import {
  fetchPublicMediaCatalog,
  resolveMediaForDetail,
} from "@/lib/public-media-catalog";
import {
  getAllMediaIds,
  getPrimaryMediaImageUrl,
  getSimilarMediaFromCatalog,
} from "@/lib/media-data";
import { getAllKeywordFilterMediaIds } from "@/lib/keyword-filter-media-detail";
import { BrutalMediaDetail } from "@/components/brutalist/media-detail";
import TrackMediaView from "@/components/track-media-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  const ids = [...getAllMediaIds(), ...getAllKeywordFilterMediaIds()];
  return ids.map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const { id } = await params;
  const media = await resolveMediaForDetail(id);
  if (!media) return { title: "Media" };
  const isKo = locale === "ko";
  const name = isKo ? media.name : media.nameEn || media.name;
  const loc = isKo ? media.location : media.locationEn || media.location;
  const title = `${name} - ${loc} | THINKAD`;
  const dailyFootfall = media.dailyFootTraffic;
  const description = isKo
    ? `${loc} 일 유동 ${dailyFootfall.toLocaleString()}명, 가시성 ${media.visibilityScore ?? 0}점. 검증된 OOH 매체.`
    : `${loc} — ${dailyFootfall.toLocaleString()} daily footfall, visibility ${media.visibilityScore ?? 0}. Verified OOH media.`;
  const heroImage = getPrimaryMediaImageUrl(media);
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/media/${media.id}`),
    openGraph: {
      title,
      description,
      type: "website",
      images: heroImage ? [heroImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function MediaDetailPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const { id: idStr } = await params;
  const media = await resolveMediaForDetail(idStr);
  if (!media) notFound();

  const catalog = await fetchPublicMediaCatalog();
  const similar = getSimilarMediaFromCatalog(catalog, media, 3);

  const placeJsonLd = buildMediaPlaceJsonLd(media, locale);
  const breadcrumbJsonLd = buildMediaBreadcrumbJsonLd(media, locale);

  return (
    <>
      <TrackMediaView mediaId={media.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([placeJsonLd, breadcrumbJsonLd]),
        }}
      />
      <BrutalMediaDetail
        media={media}
        locale={locale}
        similar={similar}
      />
    </>
  );
}
