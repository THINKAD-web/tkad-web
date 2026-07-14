import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import {
  fetchMediaForPackage,
  fetchMediaPackageBySlug,
} from "@/lib/media-package-db";

export const alt = "THINKAD OOH media package";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const isKo = locale === "ko" || locale.startsWith("ko");
  const pkg = await fetchMediaPackageBySlug(slug);
  const { media } = pkg ? await fetchMediaForPackage(pkg, 1) : { media: [] };
  const first = media[0];
  const imageUrl = first ? getPrimaryMediaImageUrl(first) : undefined;

  const title = pkg?.name ?? (isKo ? "OOH 패키지" : "OOH package");
  const subtitle =
    pkg?.subtitle?.trim() ||
    (isKo ? "검증 매체 묶음 · THINKAD" : "Verified media bundle · THINKAD");

  return new ImageResponse(
    (
      <OgLayout
        badge={pkg?.icon?.trim() || "PACKAGE"}
        title={title}
        subtitle={subtitle.slice(0, 100)}
        imageUrl={imageUrl || undefined}
      />
    ),
    { ...size },
  );
}
