import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "성공 사례",
  description:
    "싱커드와 함께한 OOH 광고 성공 사례. 데이터로 검증된 캠페인 성과와 ROI 분석 결과를 확인하세요.",
  openGraph: {
    title: "OOH 광고 성공 사례 | THINKAD 싱커드",
    description:
      "데이터로 검증된 캠페인 성공 사례와 ROI 분석 결과를 확인하세요.",
  },
};

export default function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
