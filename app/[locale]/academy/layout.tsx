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
  const title = isKo ? "웨비나 & OOH 아카데미" : "Webinars & OOH Academy";
  const description = isKo
    ? "OOH 기초 강의, 캠페인 전략 웨비나, PDF·PPT·영상 자료와 웨비나 등록을 한곳에서 제공합니다."
    : "OOH fundamentals, strategy webinars, PDFs, slides, video, and registration in one place.";
  const ogTitle = isKo
    ? "THINKAD OOH 아카데미 & 웨비나"
    : "THINKAD OOH Academy & webinars";
  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description,
      images: defaultOgImages(locale, {
        ko: "THINKAD OOH 아카데미",
        en: "THINKAD OOH Academy",
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
