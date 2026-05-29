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
  const title = isKo ? "포트폴리오" : "Portfolio";
  const description = isKo
    ? "빌보드, 디지털 사이니지, 지하철·버스 등 THINKAD가 집행한 대표 OOH 포트폴리오."
    : "Representative OOH work by THINKAD: billboards, DOOH, transit, and more.";
  const ogTitle = isKo
    ? "OOH 포트폴리오 | THINKAD 싱커드"
    : "OOH portfolio | THINKAD";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/portfolio"),
    openGraph: {
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(
        locale,
        "portfolio",
        ogAltForRoute("portfolio"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: segmentOpenGraphImages(
        locale,
        "portfolio",
        ogAltForRoute("portfolio"),
      ),
    },
  };
}

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
