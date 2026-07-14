import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";
import { ogForRoute } from "@/lib/og-route-copy";

export const alt =
  "THINKAD 싱커드 AI 매체 추천 | THINKAD AI OOH media recommendation";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = ogForRoute("recommend", locale);
  return new ImageResponse(<OgLayout {...c} />, { ...size });
}
