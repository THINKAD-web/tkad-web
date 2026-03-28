import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문의하기",
  description:
    "OOH 광고 무료 상담을 신청하세요. 30초 만에 신청 완료, 24시간 내 전문 컨설턴트가 연락드립니다.",
  openGraph: {
    title: "무료 OOH 광고 상담 | THINKAD 싱커드",
    description:
      "30초 만에 신청 완료 · 24시간 내 전문 컨설턴트 연락.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
