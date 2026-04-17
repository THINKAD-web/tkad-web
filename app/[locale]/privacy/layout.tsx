import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { defaultOgImages, pageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "개인정보 처리방침" : "Privacy Policy";
  const description = isKo
    ? "싱커드(THINKAD)는 고객의 개인정보를 중요하게 여기며 관련 법령에 따라 안전하게 처리합니다."
    : "THINKAD handles personal information in accordance with applicable privacy laws and with customer trust as the priority.";
  const alt = {
    ko: "THINKAD 개인정보 처리방침",
    en: "THINKAD Privacy Policy",
  };
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/privacy"),
    robots: { index: true, follow: true },
    openGraph: {
      title: isKo ? "개인정보 처리방침 | THINKAD" : "Privacy Policy | THINKAD",
      description,
      images: defaultOgImages(locale, alt),
    },
    twitter: {
      card: "summary_large_image",
      title: isKo ? "개인정보 처리방침 | THINKAD" : "Privacy Policy | THINKAD",
      description,
    },
  };
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
