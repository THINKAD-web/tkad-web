import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";

export const alt = "THINKAD 매체 검색 - 전국 옥외광고 매체";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgLayout
        badge="Verified Media"
        title="옥외광고 매체 검색"
        subtitle="전국 500+ 검증된 빌보드·디지털·교통 매체를 한눈에 비교하세요"
      />
    ),
    { ...size }
  );
}
