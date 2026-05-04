import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import {
  Award,
  BarChart3,
  ClipboardList,
  HeadphonesIcon,
  Lightbulb,
  MapPinned,
  Radio,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { AnimatedCard } from "@/components/animated-card";
import { Timeline } from "@/components/timeline";
import { ServicesFaq } from "@/components/services-faq";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ServicesPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "servicesPage" });

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
    <div className="relative overflow-hidden">
      <section className="relative bg-hero-void">
        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            {`// 12 / Services`}
          </p>
          <span className="mt-3 inline-flex border-2 border-primary bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
            [ {t("heroBadge")} ]
          </span>
          <h1 className="mx-auto mt-5 max-w-4xl text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-mono text-sm leading-relaxed tracking-tight text-hero-fg/75 sm:text-base">
            {t("heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <BtnBlock href="/quote" variant="accent" size="lg">
              {t("ctaButton")}
            </BtnBlock>
            <BtnBlock href="/media" variant="secondary" size="lg">
              {t("ctaSecondary")}
            </BtnBlock>
          </div>
        </div>
      </section>

      <section className="relative bg-card py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Services"
            title={t("pillarsTitle")}
            className="mb-12"
          />
          <div className="grid gap-0 md:grid-cols-3">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <AnimatedCard key={p.title} delay={i * 100}>
                  <article className="group -mt-[2px] -ml-[2px] h-full border-2 border-border bg-card p-6 transition-colors duration-300 hover:bg-foreground hover:text-background">
                    <div className="flex h-14 w-14 items-center justify-center border-2 border-border bg-primary text-primary-foreground">
                      <Icon className="h-7 w-7" aria-hidden />
                    </div>
                    <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ PILLAR / {String(i + 1).padStart(2, "0")} ]
                    </p>
                    <h3 className="mt-2 text-xl font-bold tracking-tight">{p.title}</h3>
                    <p className="mt-3 font-mono text-[12px] leading-relaxed tracking-tight opacity-85">
                      {p.body}
                    </p>
                  </article>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative bg-muted py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-primary">
            <BarChart3 className="h-5 w-5" aria-hidden />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
              [ {t("processBadge")} ]
            </span>
          </div>
          <SectionHeading
            title={t("processTitle")}
            subtitle={t("processIntro")}
            align="left"
            className="mb-12 max-w-2xl"
          />

          <div className="md:hidden flex w-full min-w-0 max-w-full flex-col gap-0 overflow-x-hidden">
            {steps.map((step, i) => (
              <AnimatedCard
                key={step.label}
                delay={i * 60}
                className="w-full min-w-0"
              >
                <article className="-mt-[2px] h-full border-2 border-border bg-card p-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary font-mono text-sm font-bold text-primary-foreground">
                    {step.label}
                  </span>
                  <h3 className="mt-3 text-base font-bold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 font-mono text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                    {`// `}{step.body}
                  </p>
                </article>
              </AnimatedCard>
            ))}
          </div>

          <div className="hidden md:block">
            <Timeline
              items={steps.map((s) => ({
                label: s.label,
                title: s.title,
                description: s.body,
              }))}
            />
          </div>
        </div>
      </section>

      <section className="relative bg-card py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="border-2 border-border bg-muted px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
            <SectionHeading
              eyebrow="Why us"
              title={t("diffTitle")}
              align="left"
              className="mb-10"
            />
            <ul className="grid gap-5 sm:grid-cols-2">
              {differentiators.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex gap-3 text-sm leading-relaxed sm:text-base"
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="pt-1 text-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative bg-card py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ServicesFaq title={t("faqTitle")} items={faqItems} />
        </div>
      </section>

      <section className="relative overflow-hidden bg-hero-void py-20 sm:py-24 lg:py-28">
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            [ NEXT STEP ]
          </p>
          <ClipboardList className="mx-auto mt-4 h-10 w-10 text-primary" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-hero-fg sm:text-3xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-mono text-sm leading-relaxed tracking-tight text-hero-fg/75 sm:text-base">
            {t("ctaSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <BtnBlock href="/quote" variant="accent" size="lg">
              {t("ctaButton")}
            </BtnBlock>
            <BtnBlock href="/media" variant="secondary" size="lg">
              {t("ctaSecondary")}
            </BtnBlock>
          </div>
        </div>
      </section>
    </div>
  );
}
