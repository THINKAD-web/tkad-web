import type { ReactNode } from "react";
import {
  ArrowRight,
  CheckSquare,
  FileText,
  Sparkles,
  Timer,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type {
  HomeLandingDigitalTile,
  HomeLandingOohTile,
} from "@/lib/home-landing-media-grid";
import { HomeMediaScroll } from "@/components/home/home-media-scroll";
import { HomeContentFeed } from "@/components/home/home-content-feed";
import { HomePrecisionExamplePanel } from "@/components/home/home-precision-example-panel";
import { HOME_PRECISION_EXAMPLES } from "@/lib/home-precision-examples";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { HomeReportItem } from "@/lib/report-queries";
import type { HomeCaseItem } from "@/lib/case-queries";

type Props = {
  mediaCountLabel: string;
  oohTiles: HomeLandingOohTile[];
  digitalTiles: HomeLandingDigitalTile[];
  popularMedia: HomeCatalogMediaItem[];
  reports: HomeReportItem[];
  cases: HomeCaseItem[];
};

function SectionShell({
  id,
  eyebrow,
  title,
  lead,
  children,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-16 border-t border-gray-100 px-4 py-14 dark:border-white/5 md:px-6 md:py-20 lg:px-8",
        className,
      )}
      aria-labelledby={`${id}-heading`}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 max-w-2xl md:mb-12">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-hermes">
            {eyebrow}
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white md:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-white/65 md:text-lg">
            {lead}
          </p>
        </header>
        {children}
      </div>
    </section>
  );
}

/**
 * Home landing narrative below explore split:
 * why 5 min → steps → precision → quote path → coverage + popular → insights → close.
 */
export async function HomePlannerLanding({
  mediaCountLabel,
  oohTiles,
  digitalTiles,
  popularMedia,
  reports,
  cases,
}: Props) {
  const locale = await getLocale();
  const isKo = locale === "ko" || locale.startsWith("ko");
  const t = await getTranslations({
    locale,
    namespace: "homePage.plannerLanding",
  });

  const metricCards = [
    { value: t("speedMetric1Value"), label: t("speedMetric1Label") },
    {
      value: t("speedMetric2Value", { count: mediaCountLabel }),
      label: t("speedMetric2Label"),
    },
  ];

  const steps = [
    {
      n: "01",
      title: t("step1Title"),
      desc: t("step1Desc"),
      icon: CheckSquare,
    },
    {
      n: "02",
      title: t("step2Title"),
      desc: t("step2Desc"),
      icon: Timer,
    },
    {
      n: "03",
      title: t("step3Title"),
      desc: t("step3Desc"),
      icon: Sparkles,
    },
  ];

  const quoteSteps = [
    t("quoteStep1"),
    t("quoteStep2"),
    t("quoteStep3"),
    t("quoteStep4"),
  ];

  const tileClass = cn(
    "flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm ring-1 ring-black/5 sm:p-4",
    "transition-colors hover:border-hermes/30 dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/10 dark:hover:border-hermes/40",
  );

  return (
    <div className="tkad-planner-landing">
      {/* ① Speed */}
      <SectionShell
        id="home-planner-speed"
        eyebrow={t("speedEyebrow")}
        title={t("speedTitle")}
        lead={t("speedLead")}
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          {metricCards.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-gray-200 bg-white px-2 py-3 sm:px-4 sm:py-5 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <p className="text-base font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                {m.value}
              </p>
              <p className="mt-1 tkad-type-meta leading-snug text-gray-600 dark:text-white/60 sm:mt-1.5">
                {m.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/planner"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-hermes px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-hermes/90"
          >
            {t("speedCtaPrimary")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/media"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
          >
            {t("speedCtaSecondary")}
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500 dark:text-white/45">
          {t("speedClose")}
        </p>
      </SectionShell>

      {/* ② Steps */}
      <SectionShell
        id="home-planner-steps"
        eyebrow={t("stepsEyebrow")}
        title={t("stepsTitle")}
        lead={t("stepsLead")}
      >
        <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.n}
                className="relative rounded-lg border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <span className="text-xs font-semibold tracking-[0.12em] text-hermes">
                  {s.n}
                </span>
                <div className="mt-3 flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-hermes/10 text-hermes">
                    <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-white/65">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 text-sm text-gray-500 dark:text-white/45">
          {t("stepsClose")}
        </p>
      </SectionShell>

      {/* ③ Precision */}
      <SectionShell
        id="home-planner-precision"
        eyebrow={t("precisionEyebrow")}
        title={t("precisionTitle")}
        lead={t("precisionLead")}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <HomePrecisionExamplePanel
            examples={HOME_PRECISION_EXAMPLES[isKo ? "ko" : "en"]}
            exampleLabel={t("precisionExampleLabel")}
            hint={t("precisionHint")}
            columnLabels={{
              region: t("precisionExampleColRegion"),
              target: t("precisionExampleColTarget"),
              goal: t("precisionExampleColGoal"),
              budget: t("precisionExampleColBudget"),
            }}
          />
          <Link
            href="/planner"
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-md border border-hermes/40 bg-hermes/5 px-5 py-2.5 text-sm font-semibold text-hermes transition-colors hover:bg-hermes/10 sm:w-auto lg:self-end"
          >
            {t("precisionCta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-6 text-sm text-gray-500 dark:text-white/45">
          {t("precisionClose")}
        </p>
      </SectionShell>

      {/* ④ Quote path */}
      <SectionShell
        id="home-planner-quote"
        eyebrow={t("quoteEyebrow")}
        title={t("quoteTitle")}
        lead={t("quoteLead")}
      >
        <ol className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {quoteSteps.map((label, i) => (
            <li
              key={label}
              className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04] sm:gap-3 sm:p-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-hermes/10 text-xs font-bold text-hermes sm:h-8 sm:w-8 sm:text-sm">
                {i + 1}
              </span>
              <span className="pt-0.5 text-xs font-medium leading-snug text-gray-800 dark:text-white/85 sm:pt-1 sm:text-sm">
                {label}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-gray-500 dark:text-white/45">
          {t("quoteClose")}
        </p>
      </SectionShell>

      {/* ⑤ Coverage + Popular */}
      <section
        id="home-planner-coverage"
        className="scroll-mt-16 border-t border-gray-100 px-4 py-12 dark:border-white/5 md:px-6 md:py-16 lg:px-8"
        aria-labelledby="home-planner-coverage-heading"
      >
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 max-w-2xl md:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hermes">
              {t("coverageEyebrow")}
            </p>
            <h2
              id="home-planner-coverage-heading"
              className="mt-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white md:text-2xl"
            >
              {t("coverageTitle", { count: mediaCountLabel })}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/65 md:text-base">
              {t("coverageLead")}
            </p>
          </header>

          <div className="space-y-8">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                {t("coverageOohLabel")}
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {oohTiles.map((tile) => (
                  <Link key={tile.subId} href={tile.href} className={tileClass}>
                    <p className="text-xs font-bold leading-snug text-gray-900 dark:text-white sm:text-base">
                      {isKo ? tile.labelKo : tile.labelEn}
                    </p>
                    {tile.count > 0 ? (
                      <p className="mt-1 text-[10px] text-gray-500 dark:text-white/45 sm:text-xs">
                        {t("coverageCount", { count: tile.count })}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                {t("coverageDigitalLabel")}
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {digitalTiles.map((tile) => (
                  <a
                    key={tile.platformId}
                    href={tile.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={tileClass}
                  >
                    <p className="text-xs font-bold leading-snug text-gray-900 dark:text-white sm:text-base">
                      {isKo ? tile.labelKo : tile.labelEn}
                    </p>
                    {tile.count > 0 ? (
                      <p className="mt-1 text-[10px] text-gray-500 dark:text-white/45 sm:text-xs">
                        {t("coverageCount", { count: tile.count })}
                      </p>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-100 pt-10 dark:border-white/5">
            <HomeMediaScroll
              eyebrow={t("popularEyebrow")}
              title={t("popularTitle")}
              subtitle={t("popularMeta")}
              media={popularMedia}
              locale={locale}
              embedded
            />
          </div>

          <p className="mt-6 text-sm text-gray-500 dark:text-white/45">
            {t("coverageClose")}
          </p>
        </div>
      </section>

      {/* Insights */}
      <HomeContentFeed
        reports={reports}
        cases={cases}
        locale={locale}
        eyebrow={t("insightsEyebrow")}
        title={t("insightsTitle")}
        lead={t("insightsLead")}
        closingNote={t("insightsClose")}
        landing
      />

      {/* ⑥ Closing CTA */}
      <section
        id="home-planner-close"
        className="scroll-mt-16 border-t border-gray-100 px-4 py-14 dark:border-white/5 md:px-6 md:py-20 lg:px-8"
        aria-labelledby="home-planner-close-heading"
      >
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 px-6 py-10 dark:border-white/10 dark:from-white/[0.06] dark:to-white/[0.02] md:px-10 md:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hermes">
              {t("closeEyebrow")}
            </p>
            <h2
              id="home-planner-close-heading"
              className="mt-2 max-w-xl text-xl font-bold tracking-tight text-gray-900 dark:text-white md:text-2xl"
            >
              {t("closeTitle")}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-gray-600 dark:text-white/65 md:text-base">
              {t("closeLead")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/planner"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-hermes px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-hermes/90"
              >
                {t("closeCtaPrimary")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/media"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
              >
                {t("closeCtaSecondary")}
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {t("closeNote")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
