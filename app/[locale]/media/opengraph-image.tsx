import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { ogForRoute } from "@/lib/og-route-copy";
import { getPublicMediaCountLabel } from "@/lib/trust-metrics";

export const alt = "THINKAD 옥외광고 매체 검색 | OOH media search";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const verifiedMediaLabel = await getPublicMediaCountLabel("verified");
  const c = ogForRoute("media", locale, verifiedMediaLabel);
  return new ImageResponse(<OgLayout {...c} />, { ...size });
}
