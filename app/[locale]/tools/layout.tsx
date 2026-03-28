import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "광고 도구",
  description:
    "OOH 광고 ROI 계산기, 매체 효과 분석 등 무료 광고 도구를 활용하세요.",
  openGraph: {
    title: "OOH 광고 도구 | THINKAD 싱커드",
    description: "OOH 광고 ROI 계산기, 매체 효과 분석 등 무료 광고 도구.",
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
