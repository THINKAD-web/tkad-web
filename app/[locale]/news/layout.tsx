import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { defaultOgImages } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "뉴스" : "News";
  const description = isKo
    ? "THINKAD 보도자료, 수상 소식, 이벤트 및 업계 뉴스를 한곳에서 확인하세요."
    : "Press releases, awards, events, and updates from THINKAD.";
  const ogTitle = isKo
    ? "뉴스 & 보도자료 | THINKAD 싱커드"
    : "News & press | THINKAD";
  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      images: defaultOgImages(locale, {
        ko: "THINKAD 뉴스 및 보도자료",
        en: "THINKAD news and press",
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
