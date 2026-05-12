import type { Metadata } from "next";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "OOH 가이드" : "OOH Guides";
  const description = isKo
    ? "지역·산업·매체 유형별 OOH 광고 집행 가이드. THINKAD 의 캠페인 데이터 기반."
    : "Region / industry / media-type OOH campaign guides. Based on THINKAD campaign data.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/guides"),
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
