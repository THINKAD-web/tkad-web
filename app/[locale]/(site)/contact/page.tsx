import { setRequestLocale, getTranslations } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CategoryExploreHero } from "@/components/category-explore-hero";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { PlanSummaryCard } from "@/components/contact/plan-summary-card";
import { ContactInfoSidebar } from "./contact-info-sidebar";
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
      <div className="tkad-landing-neon bg-gray-50 dark:bg-[#0A0A0A]">
        <CategoryExploreHero
          code={t("heroEyebrow")}
          headlineBefore={t("heroTitleBefore")}
          headlineGradient={t("heroTitleHighlight")}
          subtitle={t("heroDescription")}
        />

        <NeonSection tone="qp" className="pt-0">
          <PlanSummaryCard />

          <div className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ContactFormLoader />
            </div>
            <div className="lg:col-span-2">
              <ContactInfoSidebar locale={locale} />
            </div>
          </div>
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}
