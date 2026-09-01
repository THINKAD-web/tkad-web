import dynamic from "next/dynamic";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  Award,
  ClipboardList,
  HeadphonesIcon,
  Lightbulb,
  MapPinned,
  Radio,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { AnimatedCard } from "@/components/animated-card";
import { staggerDelayMs } from "@/lib/scroll-stagger-delay";
import { ServicesFaq } from "@/components/services-faq";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
} from "@/components/category-explore-hero";

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ServicesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "servicesPage" });
  const isKo = locale === "ko";

  const pillars = [
    { icon: Lightbulb, title: t("pillar1Title"), body: t("pillar1Body") },
    { icon: MapPinned, title: t("pillar2Title"), body: t("pillar2Body") },
    { icon: Radio, title: t("pillar3Title"), body: t("pillar3Body") },
  ] as const;

  const steps = [
    { label: "1", title: t("step1Title"), body: t("step1Body") },
    { label: "2", title: t("step2Title"), body: t("step2Body") },
    { label: "3", title: t("step3Title"), body: t("step3Body") },
    { label: "4", title: t("step4Title"), body: t("step4Body") },
    { label: "5", title: t("step5Title"), body: t("step5Body") },
  ];

  const differentiators: { icon: LucideIcon; text: string }[] = [
    { icon: ShieldCheck, text: t("diff1") },
    { icon: TrendingUp, text: t("diff2") },
    { icon: Award, text: t("diff3") },
    { icon: HeadphonesIcon, text: t("diff4") },
  ];

  const faqItems = [
    { question: t("faq1Q"), answer: t("faq1A") },
    { question: t("faq2Q"), answer: t("faq2A") },
    { question: t("faq3Q"), answer: t("faq3A") },
    { question: t("faq4Q"), answer: t("faq4A") },
  ];

  return (
    <HomeLandingDayNight>
    <div className="tkad-landing-neon">
      <CategoryExploreHero
        code="// · SERVICES"
        showBeta
        headlineBefore={isKo ? "데이터로 설계하고, " : ""}
        headlineGradient={isKo ? "현장에서 완성하는 OOH" : t("heroTitle")}
        headlineAfter={isKo ? " 파트너" : ""}
        subtitle={t("heroSubtitle")}
        className="border-b dark:border-white/10 border-gray-200"
      >
        <CategoryHeroCtaRow>
          <Link href="/quote" className={categoryHeroCtaPrimaryClass}>
            {t("ctaButton")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/media" className={categoryHeroCtaSecondaryClass}>
            {t("ctaSecondary")}
            <ArrowRight className="h-4 w-4 dark:text-white text-gray-700" aria-hidden />
          </Link>
        </CategoryHeroCtaRow>
      </CategoryExploreHero>

      {/* Pillars */}
      <NeonSection>
        <ScrollAnimate>
          <NeonSectionHead
            number="01"
            kicker="Services"
            title={<span className="tkad-home-accent-text">{t("pillarsTitle")}</span>}
            meta={t("pillarsMeta")}
          />
        </ScrollAnimate>
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <AnimatedCard key={p.title} delay={staggerDelayMs(i)}>
                <article className="group relative h-full rounded-[28px] dark:bg-white/5 bg-gray-50 p-7 backdrop-blur tkad-neon-border shadow-[0_30px_120px_rgba(0,0,0,0.78)] transition-ui hover:-translate-y-1 hover:dark:bg-white/6">
                  <div className="flex items-center justify-between">
                    <span className="tkad-type-label dark:text-white text-gray-500">
                      [{String(i + 1).padStart(2, "0")}]
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-900">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                  </div>
                  <h3 className="mt-5 text-xl font-black tracking-tight dark:text-white text-gray-900">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed dark:text-white">
                    {p.body}
                  </p>
                </article>
              </AnimatedCard>
            );
          })}
        </div>
      </NeonSection>

      {/* Process */}
      <NeonSection>
        <ScrollAnimate>
          <NeonSectionHead
            number="02"
            kicker="Process"
            title={t("processTitle")}
            meta={t("processIntro")}
          />
        </ScrollAnimate>

        <div className="grid gap-5 md:grid-cols-5">
          {steps.map((step, i) => (
            <AnimatedCard key={step.label} delay={staggerDelayMs(i)}>
              <article className="h-full rounded-[26px] dark:bg-white/5 bg-gray-50 p-6 backdrop-blur tkad-neon-border shadow-[0_28px_110px_rgba(0,0,0,0.78)] transition-ui hover:-translate-y-1 hover:dark:bg-white/6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 text-sm font-black dark:text-white text-gray-900">
                  {step.label}
                </span>
                <h3 className="mt-4 text-base font-black tracking-tight dark:text-white text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 tkad-type-meta leading-relaxed dark:text-white text-gray-600">
                  {step.body}
                </p>
              </article>
            </AnimatedCard>
          ))}
        </div>
      </NeonSection>

      {/* Differentiators */}
      <NeonSection>
        <ScrollAnimate>
          <NeonSectionHead
            number="03"
            kicker="Why us"
            title={t("diffTitle")}
            meta={isKo ? "premium operations, end-to-end" : "premium operations, end-to-end"}
          />
        </ScrollAnimate>

        <div className="rounded-[28px] dark:bg-white/5 bg-gray-50 p-8 backdrop-blur tkad-neon-border shadow-[0_30px_120px_rgba(0,0,0,0.78)] sm:p-10">
          <ul className="grid gap-5 sm:grid-cols-2">
            {differentiators.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm leading-relaxed dark:text-white text-gray-800 sm:text-base">
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:text-white text-gray-900"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </NeonSection>

      {/* FAQ */}
      <NeonSection>
        <div className="mx-auto max-w-3xl">
          <ServicesFaq title={t("faqTitle")} items={faqItems} />
        </div>
      </NeonSection>

      {/* Final CTA */}
      <NeonSection innerClassName="text-center">
        <ScrollAnimate className="mx-auto max-w-4xl">
          <p className="tkad-type-label dark:text-white text-gray-600">
            [ NEXT STEP ]
          </p>
          <ClipboardList className="mx-auto mt-4 h-10 w-10 dark:text-white text-gray-700" aria-hidden />
          <h2 className="tkad-neon-text mt-5 text-balance text-3xl font-[950] leading-[1.02] tracking-[-0.06em] dark:text-white text-gray-900 sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed dark:text-white text-gray-800 sm:text-lg">
            {t("ctaSubtitle")}
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/quote"
              className="tkad-neon-cta-clean inline-flex h-16 items-center justify-center rounded-[22px] px-10 text-base font-black dark:text-white text-gray-900 transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
            >
              {t("ctaButton")}
            </Link>
            <Link
              href="/media"
              className="inline-flex h-16 items-center justify-center rounded-[22px] border dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 px-10 text-base font-black dark:text-white text-gray-900 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-ui hover:-translate-y-1 hover:border-white/22 hover:dark:bg-white/10 bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </ScrollAnimate>
      </NeonSection>
    </div>
    </HomeLandingDayNight>
  );
}
