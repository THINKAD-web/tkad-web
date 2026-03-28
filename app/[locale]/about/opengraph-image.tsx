import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";

export const alt = "THINKAD 회사 소개 - 싱커드";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgLayout
        badge="About THINKAD"
        title="생각하는 광고회사, 싱커드"
        subtitle="2016년 설립 · 15년 이상 OOH 업력 · 100+ 대기업 파트너"
      />
    ),
    { ...size }
  );
}
