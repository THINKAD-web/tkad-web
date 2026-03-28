import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description:
    "OOH 광고와 싱커드 서비스에 대해 자주 묻는 질문과 답변. 광고 진행 절차, 비용, 매체 선정 기준 등.",
  openGraph: {
    title: "자주 묻는 질문 | THINKAD 싱커드",
    description:
      "OOH 광고와 싱커드 서비스에 대해 자주 묻는 질문과 답변.",
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
