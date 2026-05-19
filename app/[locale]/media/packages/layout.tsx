import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { pageAlternates, segmentOpenGraphImages } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "OOH 광고 패키지 | THINKAD 싱커드"
    : "OOH advertising packages | THINKAD";
  const description = isKo
    ? "강남 프리미엄, 성수 감성, K-콘텐츠 팬덤 등 목적별 큐레이션 패키지로 간편하게 시작하세요."
    : "Start fast with curated OOH packages—Gangnam premium, Seongsu lifestyle, K-content fandom, and more.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/media/packages"),
    openGraph: {
      title,
      description,
      images: segmentOpenGraphImages(
        locale,
        "media",
        ogAltForRoute("media"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function MediaPackagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
