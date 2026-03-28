import { ImageResponse } from "next/og";
import { ogSize, OgLayout } from "@/lib/og-helpers";

export const alt = "THINKAD 성공 사례 - OOH 광고 캠페인";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgLayout
        badge="Case Studies"
        title="OOH 광고 성공 사례"
        subtitle="데이터로 검증된 캠페인 성공 사례와 ROI 분석 결과"
      />
    ),
    { ...size }
  );
}
