import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { getPublishedReportBySlug } from "@/lib/report-queries";
import { labelForReportCategory } from "@/lib/report-category";

export const alt = "THINKAD OOH trend report";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const row = await getPublishedReportBySlug(slug);
  const isKo = locale === "ko";

  return new ImageResponse(
    (
      <OgLayout
        badge={
          row
            ? labelForReportCategory(row.category, isKo)
            : isKo
              ? "트렌드 리포트"
              : "Trend report"
        }
        title={row?.title ?? (isKo ? "OOH 트렌드 리포트" : "OOH trend report")}
        subtitle={row?.summary.slice(0, 120) || undefined}
      />
    ),
    { ...size },
  );
}
