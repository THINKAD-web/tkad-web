import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";

export const alt = "THINKAD 문의하기 - 무료 상담 신청";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgLayout
        badge="Contact Us"
        title="무료 OOH 광고 상담"
        subtitle="30초 만에 신청 · 24시간 내 전문 컨설턴트 연락"
      />
    ),
    { ...size }
  );
}
