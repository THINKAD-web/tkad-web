import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "매체 검색",
  description:
    "전국 500+ 검증된 옥외광고 매체를 한눈에 검색하고 비교하세요. 빌보드, 디지털 사이니지, 교통광고, 지하철 광고 등.",
  openGraph: {
    title: "옥외광고 매체 검색 | THINKAD 싱커드",
    description:
      "전국 500+ 검증된 옥외광고 매체를 한눈에 검색하고 비교하세요.",
  },
};

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
