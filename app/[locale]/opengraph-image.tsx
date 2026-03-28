import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";

export const alt = "THINKAD 싱커드 - 대한민국 No.1 OOH 광고 에이전시";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgLayout
        badge="Korea's #1 OOH Ad Agency"
        title="생각하는 광고회사, 싱커드"
        subtitle="전국 500+ 검증된 옥외광고 매체 · 데이터 기반 캠페인 컨설팅"
      />
    ),
    { ...size }
  );
}
