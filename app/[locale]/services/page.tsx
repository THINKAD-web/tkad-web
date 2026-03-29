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
  ClipboardList,
  Lightbulb,
  ListChecks,
  MapPinned,
  Radio,
} from "lucide-react";

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
    { n: 1, title: t("step1Title"), body: t("step1Body") },
    { n: 2, title: t("step2Title"), body: t("step2Body") },
    { n: 3, title: t("step3Title"), body: t("step3Body") },
    { n: 4, title: t("step4Title"), body: t("step4Body") },
    { n: 5, title: t("step5Title"), body: t("step5Body") },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="hero-pattern pointer-events-none absolute inset-0 opacity-[0.06]" />

      <section className="relative border-b border-primary/8 bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <Badge
            variant="secondary"
            className="mb-4 border-gold/25 bg-gold/10 text-xs font-semibold tracking-wide text-primary"
          >
            {t("heroBadge")}
          </Badge>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="cta" className="btn-gold rounded-full px-8" asChild>
              <Link href="/quote">{t("ctaButton")}</Link>
            </Button>
            <Button variant="outline" className="rounded-full border-primary/20" asChild>
              <Link href="/media">{t("ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {t("pillarsTitle")}
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <Card
                key={p.title}
                className="border-primary/10 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md"
              >
                <CardHeader className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 text-primary">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <CardTitle className="text-lg text-primary">{p.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {p.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="relative border-t border-primary/8 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-4 flex items-center gap-2 text-gold">
            <ListChecks className="h-5 w-5" aria-hidden />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Process
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            {t("processTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{t("processIntro")}</p>

          <ol className="mt-12 space-y-0">
            {steps.map((step, i) => (
              <li
                key={step.n}
                className="relative flex gap-4 pb-12 last:pb-0 md:gap-6"
              >
                {i < steps.length - 1 ? (
                  <div
                    className="absolute left-[1.125rem] top-12 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-gold/50 to-primary/10 md:block"
                    aria-hidden
                  />
                ) : null}
                <div className="flex shrink-0 flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-gold-light shadow-sm">
                    {step.n}
                  </span>
                </div>
                <Card className="flex-1 border-primary/10 bg-card/90 shadow-sm">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-base text-primary sm:text-lg">
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative border-t border-primary/10 bg-gradient-to-br from-primary via-navy-dark to-[#0e1228] py-16 text-white sm:py-20">
        <div className="hero-pattern absolute inset-0 opacity-[0.12]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <ClipboardList className="mx-auto h-10 w-10 text-gold" aria-hidden />
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t("ctaTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-silver/90 sm:text-base">
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
