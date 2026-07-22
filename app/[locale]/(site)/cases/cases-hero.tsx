import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";

type Props = {
  locale: string;
  empty: boolean;
};

export async function CasesHero({ locale, empty }: Props) {
  const t = await getTranslations({ locale });
  const isKo = locale === "ko";

  return (
    <CategoryExploreHero
      code="// 01 · CASES"
      headlineBefore={isKo ? "브랜드가 선택한 " : "Brands chose "}
      headlineGradient={isKo ? "성공 사례 허브" : "success story hub"}
      subtitle={empty ? t("cases.reportHeroSubtitle") : t("cases.subtitle")}
    >
      <CategoryHeroCtaRow>
        <Link href="/quote" className={categoryHeroCtaPrimaryClass}>
          {t("cases.reportCtaQuote")}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <Link href="/contact" className={categoryHeroCtaSecondaryClass}>
          {isKo ? "무료 상담" : "Free consult"}
          <ArrowRight className="h-3.5 w-3.5 dark:text-white text-gray-700" aria-hidden />
        </Link>
      </CategoryHeroCtaRow>
    </CategoryExploreHero>
  );
}
