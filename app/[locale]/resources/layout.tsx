import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리소스 & 인사이트",
  description:
    "최신 OOH 광고 트렌드, 가이드, 성공 사례 리포트. 데이터 기반 인사이트로 효과적인 광고 전략을 수립하세요.",
  openGraph: {
    title: "OOH 광고 리소스 & 인사이트 | THINKAD 싱커드",
    description:
      "최신 OOH 광고 트렌드, 가이드, 성공 사례 리포트.",
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
