import { getTranslations } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
  CategoryHeroCtaRow,
} from "@/components/category-explore-hero";
import {
  AboutBrandTimeline,
  ABOUT_TIMELINE_YEARS,
  type AboutTimelineItem,
} from "@/components/about/about-brand-timeline";
import { ArrowRight } from "lucide-react";
import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";
import { cn } from "@/lib/utils";

type Props = { verifiedLabel: string };

function BulletSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
          {title}
        </h2>
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-2xl bg-white px-5 py-4 text-base leading-relaxed text-gray-700 dark:bg-white/5 dark:text-white/80 md:text-lg"
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--qp-accent)]"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function AboutPageSections({ verifiedLabel }: Props) {
  const t = await getTranslations("about");

  const timelineItems: AboutTimelineItem[] = ABOUT_TIMELINE_YEARS.map(
    (entry) => {
      const titleKey = `history${entry.year}` as
        | "history2014"
        | "history2017"
        | "history2022"
        | "history2026";
      const descKey = `history${entry.year}Desc` as
        | "history2014Desc"
        | "history2017Desc"
        | "history2022Desc"
        | "history2026Desc";
      return {
        year: entry.year,
        icon: entry.icon,
        title: t(titleKey),
        description: t(descKey),
        current: "current" in entry ? entry.current : false,
      };
    },
  );

  const companyLeft = [
    [t("companyNameLabel"), t("companyNameValue")],
    [t("companyCeoLabel"), t("companyCeoValue")],
    [t("companyBizLabel"), t("companyBizValue")],
    [t("companyEcommerceLabel"), t("companyEcommerceValue")],
    [t("companyAddressLabel"), t("companyAddressValue")],
  ] as const;

  const companyRight = [
    [t("companyPhoneLabel"), t("companyPhoneValue")],
    [t("companyEmailLabel"), t("companyEmailValue")],
    [t("companyHoursLabel"), t("companyHoursValue")],
  ] as const;

  const cardClass = cn(
    "flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm",
    "dark:border-white/10 dark:bg-white/5 md:p-6",
  );

  const cardCtaClass = cn(
    "mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 py-2.5",
    "tkad-type-title transition-colors",
  );

  return (
    <>
      <BulletSection
        title={t("capabilitiesTitle")}
        items={[
          t("capability1", { count: verifiedLabel }),
          t("capability2"),
          t("capability3"),
          t("capability4"),
        ]}
      />

      <BulletSection
        title={t("trustTitle")}
        items={[t("trust1"), t("trust3")]}
      />

      <section className="py-16 md:py-24" aria-labelledby="about-ecosystem-heading">
        <div className="mx-auto max-w-4xl px-4">
          <h2
            id="about-ecosystem-heading"
            className="mb-3 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl"
          >
            {t("ecosystemTitle")}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm leading-relaxed text-gray-600 dark:text-white/65 md:text-base">
            {t("ecosystemBody")}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <article className={cardClass}>
              <p className="tkad-type-title uppercase tracking-[0.14em] text-hermes">
                {t("ecosystemIntegratedBadge")}
              </p>
              <h3 className="mt-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                {t("ecosystemIntegratedTitle")}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-white/65">
                {t("ecosystemIntegratedDesc")}
              </p>
              <Link
                href="/planner/integrated"
                className={cn(
                  cardCtaClass,
                  "bg-hermes text-white hover:bg-hermes/90",
                )}
              >
                {t("ecosystemIntegratedCta")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>

            <article className={cardClass}>
              <p className="tkad-type-title uppercase tracking-[0.14em] text-hermes">
                {t("ecosystemDigitalBadge")}
              </p>
              <h3 className="mt-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                {t("ecosystemDigitalTitle")}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-white/65">
                {t("ecosystemDigitalDesc")}
              </p>
              <a
                href={THINKAD_DIGITAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  cardCtaClass,
                  "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
                  "dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5",
                )}
                aria-label={t("ecosystemDigitalCtaExternal")}
              >
                {t("ecosystemDigitalCta")}
                <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
              </a>
            </article>
          </div>
        </div>
      </section>

      <AboutBrandTimeline
        title={t("historyTitle")}
        items={timelineItems}
        currentLabel={t("timelineCurrent")}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            {t("companyTitle")}
          </h2>
          <div className="grid gap-10 md:grid-cols-2">
            <dl className="space-y-4">
              {companyLeft.map(([label, value]) => (
                <div key={label}>
                  <dt className="tkad-type-title uppercase tracking-wide text-gray-500 dark:text-white/45">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-white/80">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="space-y-4">
              {companyRight.map(([label, value]) => (
                <div key={label}>
                  <dt className="tkad-type-title uppercase tracking-wide text-gray-500 dark:text-white/45">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-white/80">
                    {label === t("companyEmailLabel") ? (
                      <a
                        href="mailto:sales@tkad.co.kr"
                        className="text-hermes hover:underline"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl bg-hermes p-10 text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              {t("ctaTitle")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg whitespace-pre-line text-sm leading-relaxed text-white/90 md:text-base">
              {t("ctaSubtitle", { count: verifiedLabel })}
            </p>
            <CategoryHeroCtaRow className="mt-8 justify-center">
              <Link
                href="/media"
                className={cn(
                  categoryHeroCtaPrimaryClass,
                  "border-0 bg-white text-hermes hover:bg-white/95",
                )}
              >
                {t("ctaExplore")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/recommend"
                className={cn(
                  categoryHeroCtaSecondaryClass,
                  "border-white/30 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                {t("ctaRecommend")}
              </Link>
              <Link
                href="/planner"
                className={cn(
                  categoryHeroCtaSecondaryClass,
                  "border-white/30 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                {t("ctaPlanner")}
              </Link>
              <Link
                href="/contact"
                className={cn(
                  categoryHeroCtaSecondaryClass,
                  "border-white/30 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                {t("ctaContact")}
              </Link>
            </CategoryHeroCtaRow>
          </div>
        </div>
      </section>
    </>
  );
}
