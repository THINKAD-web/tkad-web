import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { SearchResultsClient } from "@/components/search/search-results-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo ? "검색 | THINKAD 싱커드" : "Search | THINKAD";
  const description = isKo
    ? "매체·사례·리포트·가이드를 한곳에서 검색하세요. THINKAD 싱커드."
    : "Search OOH media, case studies, reports, and guides on THINKAD.";

  return {
    title,
    description,
    alternates: pageAlternates(locale, "/search"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/search",
      image: { kind: "default" },
    }),
  };
}

export default async function SearchPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  return (
    <Suspense fallback={null}>
      <SearchResultsClient />
    </Suspense>
  );
}
