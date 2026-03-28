import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "매체 비교",
  description:
    "옥외광고 매체를 나란히 비교하세요. 위치, 노출량, 가격, ROI를 한눈에 비교 분석.",
  openGraph: {
    title: "매체 비교 | THINKAD 싱커드",
    description: "옥외광고 매체를 나란히 비교 분석하세요.",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
