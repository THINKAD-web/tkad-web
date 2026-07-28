import {
  ExternalLink,
  Layers,
  MonitorSmartphone,
  PanelsTopLeft,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { THINKAD_DIGITAL_URL } from "@/lib/navigation/cross-brand";
import { cn } from "@/lib/utils";

/**
 * 홈 히어로 직하 — OOH / 디지털 / 통합 플래닝 세 축 안내.
 * 히어로·explore 분기 UI는 건드리지 않음.
 */
export async function HomeTwoAxis() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "homePage.twoAxis" });

  const cardClass = cn(
    "flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5",
    "dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/10 md:p-6",
  );

  const ctaClass = cn(
    "mt-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 py-2.5",
    "text-sm font-semibold transition-colors",
  );

  return (
    <section
      id="home-two-axis"
      className="scroll-mt-16 px-4 pb-2 pt-1 md:px-6 md:pb-3 lg:px-8"
      aria-labelledby="home-two-axis-heading"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 md:mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-hermes">
            {t("eyebrow")}
          </p>
          <h2
            id="home-two-axis-heading"
            className="mt-1 text-xl font-bold tracking-tight text-gray-900 dark:text-white md:text-2xl"
          >
            {t("title")}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-600 dark:text-white/65 md:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <article className={cardClass}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-hermes/10 text-hermes">
                <PanelsTopLeft className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {t("oohTitle")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
                  {t("oohBadge")}
                </p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-base text-gray-600 dark:text-white/65">
              {t("oohDesc")}
            </p>
            <Link
              href="/media"
              className={cn(
                ctaClass,
                "bg-hermes text-white hover:bg-hermes/90",
              )}
            >
              {t("oohCta")}
            </Link>
          </article>

          <article className={cardClass}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-hermes/10 text-hermes">
                <MonitorSmartphone className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {t("digitalTitle")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
                  {t("digitalBadge")}
                </p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-base text-gray-600 dark:text-white/65">
              {t("digitalDesc")}
            </p>
            <a
              href={THINKAD_DIGITAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                ctaClass,
                "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
                "dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5",
              )}
              aria-label={t("digitalCtaExternal")}
            >
              {t("digitalCta")}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </a>
          </article>

          <article className={cardClass}>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-hermes/10 text-hermes">
                <Layers className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  {t("integratedTitle")}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-white/50">
                  {t("integratedBadge")}
                </p>
              </div>
            </div>
            <p className="mt-3 flex-1 text-base text-gray-600 dark:text-white/65">
              {t("integratedDesc")}
            </p>
            <Link
              href="/planner/integrated"
              className={cn(
                ctaClass,
                "border border-hermes/40 bg-hermes/5 text-hermes hover:bg-hermes/10",
                "dark:border-hermes/50 dark:bg-hermes/10 dark:text-hermes dark:hover:bg-hermes/15",
              )}
            >
              {t("integratedCta")}
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
