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
  const title = isKo ? "클라이언트 포털" : "Client portal";
  const description = isKo
    ? "진행 중인 OOH 캠페인과 담당 매니저 정보를 확인하는 클라이언트 전용 영역입니다."
    : "Client-only area to review active OOH campaigns and account contacts.";
  const ogTitle = isKo
    ? "클라이언트 포털 | THINKAD"
    : "Client portal | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/client"),
    robots: { index: false, follow: false },
    openGraph: {
      title: ogTitle,
      description,
      images: defaultOgImages(locale, {
        ko: "THINKAD 클라이언트 포털",
        en: "THINKAD client portal",
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: defaultOgImages(locale, {
        ko: "THINKAD 클라이언트 포털",
        en: "THINKAD client portal",
      }),
    },
  };
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
