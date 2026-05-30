import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { buildShareMetadata, pageAlternates } from "@/lib/seo";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { curateAllBudgetTiers } from "@/lib/budget-tool-curations";
import { BudgetToolClient } from "./budget-tool-client";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { deferCatalogLandingStaticGeneration } from "@/lib/vercel-static-build";

export const revalidate = 300;
export const dynamic = deferCatalogLandingStaticGeneration()
  ? "force-dynamic"
  : "auto";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  const title = isKo
    ? "예산별 OOH 매체 조합 | THINKAD"
    : "OOH mixes by budget | THINKAD";
  const description = isKo
    ? "500만·1,000만·3,000만원 예산별로 큐레이션된 옥외광고 매체 조합을 확인하세요."
    : "Curated OOH media mixes for 5M, 10M, and 30M KRW monthly budgets.";
  return {
    title,
    description,
    alternates: pageAlternates(locale, "/budget-tool"),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: "/budget-tool",
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function BudgetToolPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const catalog = await fetchPublicMediaCatalog();
  const curations = curateAllBudgetTiers(catalog);

  return (
    <HomeLandingDayNight>
      <BudgetToolClient curations={curations} locale={locale} />
    </HomeLandingDayNight>
  );
}
