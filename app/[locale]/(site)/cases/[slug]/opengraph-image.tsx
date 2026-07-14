import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { getPublishedSuccessCaseById } from "@/lib/public-content-queries";

export const alt = "THINKAD 케이스 스터디";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const row = await getPublishedSuccessCaseById(slug);
  const isKo = locale === "ko";

  return new ImageResponse(
    (
      <OgLayout
        badge={row?.industry ?? "Case Study"}
        title={
          isKo
            ? (row?.titleKo ?? "OOH 광고 성공 사례")
            : (row?.titleEn ?? row?.titleKo ?? "OOH campaign case study")
        }
        subtitle={
          isKo
            ? (row?.summaryKo ?? "").slice(0, 120) || undefined
            : row?.titleEn
              ? "Campaign strategy, media execution, and measurable OOH outcomes."
              : "THINKAD case study"
        }
      />
    ),
    { ...size }
  );
}
