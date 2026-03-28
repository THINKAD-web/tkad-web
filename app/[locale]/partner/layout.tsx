import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { defaultOgImages, pageAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "파트너 포털" : "Partner portal";
  const description = isKo
    ? "협력 계약, 매체 등록, 정산, 캠페인 공유, 공지를 확인하는 파트너 전용 영역입니다."
    : "Partner-only area for contracts, media listings, settlements, campaign sharing, and notices.";
  const ogTitle = isKo ? "파트너 포털 | THINKAD" : "Partner portal | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/partner"),
    robots: { index: false, follow: false },
    openGraph: {
      title: ogTitle,
      description,
      images: defaultOgImages(locale, {
        ko: "THINKAD 파트너 포털",
        en: "THINKAD partner portal",
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
