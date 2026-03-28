import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "문의하기" : "Contact";
  const description = isKo
    ? "OOH 광고 무료 상담을 신청하세요. 30초 만에 신청 완료, 24시간 내 전문 컨설턴트가 연락드립니다."
    : "Request a free OOH consultation. Apply in 30 seconds; a specialist will reach out within 24 hours.";
  const ogTitle = isKo
    ? "무료 OOH 광고 상담 | THINKAD 싱커드"
    : "Free OOH consultation | THINKAD";
  const ogDesc = isKo
    ? "30초 만에 신청 완료 · 24시간 내 전문 컨설턴트 연락."
    : "Apply in 30 seconds · hear from our consultants within 24 hours.";
  return {
    title,
    description,
    openGraph: { title: ogTitle, description: ogDesc },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDesc,
    },
  };
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
