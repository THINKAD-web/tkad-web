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
  const title = isKo ? "AI 매체 추천" : "AI media recommendation";
  const description = isKo
    ? "캠페인 목표·예산·지역을 입력하면 최적 OOH 매체를 추천합니다. 리스트·지도 뷰와 장바구니로 견적까지 한 번에."
    : "Enter campaign goals, budget, and region for ranked OOH picks. List & map views, cart, and quote in one flow.";
  const ogTitle = isKo
    ? "싱커드 AI 매체 추천 | THINKAD"
    : "THINKAD AI OOH media recommendation";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/recommend"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(
        locale,
        "recommend",
        ogAltForRoute("recommend"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(
        locale,
        "recommend",
        ogAltForRoute("recommend"),
      ),
    },
  };
}

export default function RecommendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
