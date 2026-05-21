import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import { resolveMediaForDetail } from "@/lib/public-media-catalog";
import { buildMediaImageAlt } from "@/lib/media-image-seo";

export const alt = "THINKAD OOH media";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const media = await resolveMediaForDetail(id);
  const isKo = locale === "ko" || locale.startsWith("ko");

  const title = media
    ? isKo
      ? media.name
      : media.nameEn || media.name
    : isKo
      ? "옥외광고 매체"
      : "OOH media";

  const subtitle = media
    ? buildMediaImageAlt(media, locale)
    : "THINKAD";

  const badge = media?.district || media?.city || media?.region || "OOH";
  const imageUrl = media ? getPrimaryMediaImageUrl(media) : undefined;

  return new ImageResponse(
    (
      <OgLayout
        badge={badge}
        title={title}
        subtitle={subtitle.slice(0, 100)}
        imageUrl={imageUrl || undefined}
      />
    ),
    { ...size },
  );
}
