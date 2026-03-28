import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "견적 요청",
  description:
    "OOH 광고 견적을 무료로 요청하세요. 예산, 매체, 기간에 맞는 맞춤형 견적을 빠르게 받아보세요.",
  openGraph: {
    title: "OOH 광고 견적 요청 | THINKAD 싱커드",
    description: "예산, 매체, 기간에 맞는 맞춤형 견적을 빠르게 받아보세요.",
  },
};

export default function QuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
