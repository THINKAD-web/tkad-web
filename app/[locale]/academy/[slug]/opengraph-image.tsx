import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { getPublishedAcademyArticleBySlug } from "@/lib/academy-article-queries";
import { labelForAcademyCategory } from "@/lib/academy-article-category";

export const alt = "THINKAD OOH Academy";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const row = await getPublishedAcademyArticleBySlug(slug);
  const isKo = locale === "ko";

  return new ImageResponse(
    (
      <OgLayout
        badge={
          row
            ? labelForAcademyCategory(row.category, isKo)
            : isKo
              ? "OOH 아카데미"
              : "OOH Academy"
        }
        title={row?.title ?? (isKo ? "OOH 광고 가이드" : "OOH advertising guide")}
        subtitle={row?.summary.slice(0, 120) || undefined}
      />
    ),
    { ...size },
  );
}
