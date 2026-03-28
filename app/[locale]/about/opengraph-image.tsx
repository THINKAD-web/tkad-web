import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { ogForRoute } from "@/lib/og-route-copy";

export const alt = "THINKAD 회사 소개 | About THINKAD OOH agency";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = ogForRoute("about", locale);
  return new ImageResponse(<OgLayout {...c} />, { ...size });
}
