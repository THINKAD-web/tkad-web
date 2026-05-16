import dynamic from "next/dynamic";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
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
import { ServicesFaq } from "@/components/services-faq";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

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
      {/* Hero — 홈 `HomeHeroNeo`와 동일 토큰·쉘(`tkad-home-hero` + `tkad-neon-surface`) */}
      <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
        <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
        <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
        <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-28 text-center sm:px-6 sm:pb-44 sm:pt-40 lg:px-8 lg:pb-56 lg:pt-48">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center gap-3">
              <span className="tkad-neon-border rounded-2xl bg-white/5 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/78 backdrop-blur">
                <span className="tkad-home-accent-text">[ Services ]</span>
                <span className="text-white/55">{isKo ? " / 집행 서비스" : " / Execution services"}</span>
              </span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                {`// ${t("heroBadge")}`}
              </p>
            </div>

            <h1 className="mt-6 text-balance text-[clamp(44px,5.8vw,76px)] font-[950] leading-[0.92] tracking-[-0.065em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
              {t("heroTitle")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
              {t("heroSubtitle")}
            </p>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/quote"
                className="tkad-neon-cta-clean inline-flex h-16 items-center justify-center rounded-[22px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
              >
                {t("ctaButton")}
              </Link>
              <Link
                href="/media"
                className="inline-flex h-16 items-center justify-center rounded-[22px] border border-white/14 bg-white/6 px-10 text-base font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

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
              <AnimatedCard key={p.title} delay={i * 80}>
                <article className="group relative h-full rounded-[28px] bg-white/5 p-7 backdrop-blur tkad-neon-border shadow-[0_30px_120px_rgba(0,0,0,0.78)] transition-all hover:-translate-y-1 hover:bg-white/6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                      [{String(i + 1).padStart(2, "0")}]
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white">
                      <Icon className="h-6 w-6" aria-hidden />
                    </div>
                  </div>
                  <h3 className="mt-5 text-xl font-black tracking-tight text-white">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/76">
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
            <AnimatedCard key={step.label} delay={i * 60}>
              <article className="h-full rounded-[26px] bg-white/5 p-6 backdrop-blur tkad-neon-border shadow-[0_28px_110px_rgba(0,0,0,0.78)] transition-all hover:-translate-y-1 hover:bg-white/6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 font-mono text-sm font-black text-white">
                  {step.label}
                </span>
                <h3 className="mt-4 text-base font-black tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-[12px] leading-relaxed text-white/70">
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

        <div className="rounded-[28px] bg-white/5 p-8 backdrop-blur tkad-neon-border shadow-[0_30px_120px_rgba(0,0,0,0.78)] sm:p-10">
          <ul className="grid gap-5 sm:grid-cols-2">
            {differentiators.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm leading-relaxed text-white/82 sm:text-base">
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white"
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
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">
            [ NEXT STEP ]
          </p>
          <ClipboardList className="mx-auto mt-4 h-10 w-10 text-white/80" aria-hidden />
          <h2 className="tkad-neon-text mt-5 text-balance text-3xl font-[950] leading-[1.02] tracking-[-0.06em] text-white sm:text-4xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/82 sm:text-lg">
            {t("ctaSubtitle")}
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href="/quote"
              className="tkad-neon-cta-clean inline-flex h-16 items-center justify-center rounded-[22px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
            >
              {t("ctaButton")}
            </Link>
            <Link
              href="/media"
              className="inline-flex h-16 items-center justify-center rounded-[22px] border border-white/14 bg-white/6 px-10 text-base font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
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
