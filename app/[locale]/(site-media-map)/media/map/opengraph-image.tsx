import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { ogForRoute } from "@/lib/og-route-copy";

export const alt =
  "THINKAD 지도 매체 검색 | THINKAD OOH map search";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = ogForRoute("map", locale);
  return new ImageResponse(<OgLayout {...c} />, { ...size });
}
