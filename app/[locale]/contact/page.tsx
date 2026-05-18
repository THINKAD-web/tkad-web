import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { ContactNeonClient } from "./contact-neon-client";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const isKo = locale === "ko";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon bg-[#0A0A0A]">
        <CategoryExploreHero
          code="// 12 · CONTACT"
          headlineBefore={isKo ? "" : ""}
          headlineGradient={t("title")}
          subtitle={t("subtitle")}
        >
          <CategoryHeroCtaRow>
            <Link href="/quote" className={categoryHeroCtaPrimaryClass}>
              {t("heroCtaQuote")}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/media" className={categoryHeroCtaSecondaryClass}>
              {t("heroCtaMedia")}
              <ArrowRight className="h-4 w-4 text-white/75" aria-hidden />
            </Link>
          </CategoryHeroCtaRow>
        </CategoryExploreHero>

        <ContactNeonClient />
      </div>
    </HomeLandingDayNight>
  );
}
