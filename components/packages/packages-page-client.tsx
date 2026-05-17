"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import type { ResolvedMediaPackage } from "@/lib/media-packages";
import type { PackagePurpose } from "@/data/packages";
import { PackageCard } from "@/components/packages/package-card";
import { CategoryExploreHero } from "@/components/category-explore-hero";
import { cn } from "@/lib/utils";

type Props = {
  packages: ResolvedMediaPackage[];
};

const FILTER_KEYS: Array<{ key: "all" | PackagePurpose; tone: string }> = [
  { key: "all", tone: "from-violet-500 to-cyan-400" },
  { key: "brand", tone: "from-violet-500 to-pink-500" },
  { key: "launch", tone: "from-pink-500 to-cyan-400" },
  { key: "popup", tone: "from-rose-500 to-violet-500" },
  { key: "coverage", tone: "from-amber-500 to-cyan-400" },
];

export function PackagesPageClient({ packages }: Props) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const isKo = locale === "ko";
  const [active, setActive] =
    useState<"all" | PackagePurpose>("all");

  const visible = useMemo(() => {
    if (active === "all") return packages;
    return packages.filter((p) => p.purposes.includes(active));
  }, [packages, active]);

  return (
    <div className="min-h-screen bg-[#F4F4F2] text-foreground transition-colors dark:bg-[#0A0A0A]">
      <CategoryExploreHero
        code="// 03 · PACKAGES"
        headlineBefore={isKo ? "목적에 맞는 " : "OOH packages for "}
        headlineGradient={isKo ? "OOH 패키지" : "your goals"}
        subtitle={t("hero.subtitle")}
      >
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <a
                href="#package-grid"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-7 text-sm font-bold text-white shadow-[0_18px_48px_rgba(139,92,246,0.35)] transition-transform hover:-translate-y-0.5"
              >
                {t("hero.ctaPrimary")} <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <Link
                href="/planner"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/6 px-7 text-sm font-bold text-white transition-colors hover:border-white/22 hover:bg-white/10"
              >
                {t("hero.ctaSecondary")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <dl className="mt-12 grid w-full max-w-3xl grid-cols-3 gap-3 sm:gap-6 mx-auto">
              {[
                {
                  label: t("hero.stat1Label"),
                  value: t("hero.stat1Value"),
                },
                {
                  label: t("hero.stat2Label"),
                  value: t("hero.stat2Value"),
                },
                {
                  label: t("hero.stat3Label"),
                  value: t("hero.stat3Value"),
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-black/5 bg-white/70 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/5"
                >
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd className="mt-2 bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text font-mono text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
      </CategoryExploreHero>


      {/* Filter tabs */}
      <section
        id="package-grid"
        aria-label={t("filter.all")}
        className="border-y border-black/[0.04] bg-white/50 backdrop-blur dark:border-white/[0.06] dark:bg-white/[0.025]"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-4 sm:gap-3 sm:px-6 sm:py-5 lg:px-8">
          {FILTER_KEYS.map((f) => {
            const isActive = active === f.key;
            const label = t(`filter.${f.key}`);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActive(f.key)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full px-4 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-all",
                  isActive
                    ? `bg-gradient-to-r ${f.tone} text-white shadow-[0_10px_24px_rgba(139,92,246,0.28)]`
                    : "border border-foreground/10 bg-white/60 text-foreground/80 hover:border-foreground/20 hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75 dark:hover:bg-white/[0.08]",
                )}
                aria-pressed={isActive}
              >
                {isActive ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {label}
              </button>
            );
          })}
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {visible.length} / {packages.length}
          </span>
        </div>
      </section>

      {/* Package grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-black/10 bg-white/60 p-12 text-center dark:border-white/12 dark:bg-white/[0.03]">
            <Sparkles className="h-7 w-7 text-violet-500" aria-hidden />
            <p className="text-lg font-bold text-foreground">{t("filter.empty")}</p>
            <Link
              href="/planner"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 text-sm font-bold text-white"
            >
              {t("custom.cta")} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((pkg) => (
              <PackageCard
                key={pkg.slug}
                pkg={pkg}
                isKo={isKo}
                cardLabels={{
                  media: t("card.media"),
                  impression: t("card.impression"),
                  budget: t("card.budget"),
                  reason: t("card.reason"),
                  industries: t("card.industries"),
                  cta: t("card.cta"),
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Custom packager CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 p-8 text-white shadow-[0_30px_120px_rgba(139,92,246,0.45)] sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_60%)]"
          />
          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-[1.4fr,1fr] sm:items-center">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">
                {t("custom.eyebrow")}
              </p>
              <h2 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                {t("custom.title")}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                {t("custom.subtitle")}
              </p>
            </div>
            <div className="flex justify-start sm:justify-end">
              <Link
                href="/planner"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 text-base font-bold text-violet-700 shadow-[0_18px_48px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5"
              >
                {t("custom.cta")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
