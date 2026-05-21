import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";
import { ContactHeroServer } from "./contact-hero-server";
import { ContactFormLoader } from "./contact-form-loader";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon bg-[#0A0A0A]">
        <CategoryExploreHero
          code="// 12 · CONTACT"
          headlineBefore=""
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
              <ArrowRight className="h-4 w-4 dark:text-white text-gray-700" aria-hidden />
            </Link>
          </CategoryHeroCtaRow>
        </CategoryExploreHero>

        <ContactHeroServer locale={locale} />
        <ContactFormLoader />
      </div>
    </HomeLandingDayNight>
  );
}
