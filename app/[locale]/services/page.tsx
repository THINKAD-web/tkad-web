import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Check,
  ClipboardList,
  Lightbulb,
  MapPinned,
  Radio,
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
    {
      icon: Lightbulb,
      title: t("pillar1Title"),
      body: t("pillar1Body"),
    },
    {
      icon: MapPinned,
      title: t("pillar2Title"),
      body: t("pillar2Body"),
    },
    {
      icon: Radio,
      title: t("pillar3Title"),
      body: t("pillar3Body"),
    },
  ] as const;

  const steps = [
    { label: "1", title: t("step1Title"), body: t("step1Body") },
    { label: "2", title: t("step2Title"), body: t("step2Body") },
    { label: "3", title: t("step3Title"), body: t("step3Body") },
    { label: "4", title: t("step4Title"), body: t("step4Body") },
    { label: "5", title: t("step5Title"), body: t("step5Body") },
  ];

  const differentiators = [
    t("diff1"),
    t("diff2"),
    t("diff3"),
    t("diff4"),
  ];

  const faqItems = [
    { question: t("faq1Q"), answer: t("faq1A") },
    { question: t("faq2Q"), answer: t("faq2A") },
    { question: t("faq3Q"), answer: t("faq3A") },
    { question: t("faq4Q"), answer: t("faq4A") },
  ];

  return (
    <div className="relative overflow-hidden">
      <div
        className="hero-pattern pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden
      />

      <section className="relative border-b border-navy/8 bg-gradient-to-b from-navy/[0.04] via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <Badge
            variant="secondary"
            className="mb-5 border-gold/25 bg-gold/10 text-xs font-semibold tracking-wide text-navy"
          >
            {t("heroBadge")}
          </Badge>
          <h1 className="max-w-4xl text-3xl font-extrabold tracking-tight text-navy sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            {t("heroTitle")}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button variant="cta" className="btn-gold rounded-full px-8" asChild>
              <Link href="/quote">{t("ctaButton")}</Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-navy/15 text-navy hover:bg-navy/[0.04]"
              asChild
            >
              <Link href="/media">{t("ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative bg-white py-24 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Services"
            title={t("pillarsTitle")}
            className="mb-14"
          />
          <div className="grid gap-8 md:grid-cols-3">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <AnimatedCard key={p.title} delay={i * 100}>
                  <Card className="group h-full rounded-2xl border border-navy/8 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-gold/[0.06] hover:shadow-md">
                    <CardHeader className="space-y-4 pb-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/12 text-navy transition-colors duration-300 group-hover:bg-gold/20">
                        <Icon className="h-8 w-8" aria-hidden />
                      </div>
                      <CardTitle className="text-xl text-navy">{p.title}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed sm:text-[15px]">
                        {p.body}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative border-t border-navy/8 bg-slate-50 py-24 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-gold">
            <BarChart3 className="h-5 w-5" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              {t("processBadge")}
            </span>
          </div>
          <SectionHeading
            title={t("processTitle")}
            subtitle={t("processIntro")}
            align="left"
            className="mb-12 max-w-2xl"
          />

          <div className="md:hidden flex w-full min-w-0 max-w-full flex-col gap-4 overflow-x-hidden">
            {steps.map((step, i) => (
              <AnimatedCard
                key={step.label}
                delay={i * 60}
                className="w-full min-w-0"
              >
                <Card className="h-full rounded-2xl border border-navy/8 bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-navy text-sm font-bold text-gold-light shadow-sm">
                      {step.label}
                    </span>
                    <CardTitle className="pt-2 text-base text-navy">
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm leading-relaxed text-muted-foreground break-words">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
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

      <section className="relative bg-white py-24 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-navy/8 bg-slate-50/80 px-6 py-12 shadow-sm sm:px-10 sm:py-14 lg:px-14">
            <SectionHeading
              eyebrow="Why us"
              title={t("diffTitle")}
              align="left"
              className="mb-10"
            />
            <ul className="grid gap-5 sm:grid-cols-2">
              {differentiators.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed sm:text-base">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-navy">
                    <Check className="h-3.5 w-3.5 text-gold" strokeWidth={2.5} />
                  </span>
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative border-t border-navy/8 bg-white py-24 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <ServicesFaq title={t("faqTitle")} items={faqItems} />
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-navy/10 py-24 sm:py-28">
        <div
          className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-[#0c1024]"
          aria-hidden
        />
        <div
          className="hero-pattern pointer-events-none absolute inset-0 opacity-[0.12]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <ClipboardList className="mx-auto h-10 w-10 text-gold" aria-hidden />
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {t("ctaSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              variant="cta"
              className="btn-gold rounded-full px-10 shadow-lg shadow-cta/30"
              asChild
            >
              <Link href="/quote">{t("ctaButton")}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-white/25 bg-white/5 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/media">{t("ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
