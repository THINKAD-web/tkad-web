import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { ogForRoute } from "@/lib/og-route-copy";

export const alt = "THINKAD 문의 · 무료 OOH 상담 | Contact THINKAD";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = ogForRoute("contact", locale);
  return new ImageResponse(<OgLayout {...c} />, { ...size });
}
