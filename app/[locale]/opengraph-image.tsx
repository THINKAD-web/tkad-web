import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { ogForRoute } from "@/lib/og-route-copy";
import { getPublicMediaCountLabel } from "@/lib/trust-metrics";

export const alt =
  "THINKAD 싱커드 — Korea OOH agency | 대한민국 No.1 옥외광고 에이전시";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const verifiedMediaLabel = await getPublicMediaCountLabel("verified");
  const c = ogForRoute("home", locale, verifiedMediaLabel);
  return new ImageResponse(<OgLayout {...c} />, { ...size });
}
