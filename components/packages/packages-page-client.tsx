"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Package } from "lucide-react";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { SectionHead } from "@/components/brutalist/section-head";
import type { ResolvedMediaPackage } from "@/lib/media-packages";
import { PackageCard } from "@/components/packages/package-card";

type Props = {
  packages: ResolvedMediaPackage[];
};

export function PackagesPageClient({ packages }: Props) {
  const t = useTranslations("packages");
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pb-32 sm:pt-32 lg:px-8 lg:pb-40 lg:pt-36">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              {t("heroEyebrow")}
            </p>
            <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
              <h1 className="text-balance text-[clamp(40px,5.4vw,72px)] font-[950] leading-[0.92] tracking-[-0.065em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
                {t("heroTitle")}
              </h1>
              <span className="tkad-neon-border inline-flex items-center gap-1.5 rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                <Package className="h-3.5 w-3.5" aria-hidden />
                {t("heroBadge")}
              </span>
            </div>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
              {t("heroSubtitle")}
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/contact"
                className="tkad-neon-cta-clean inline-flex h-14 items-center justify-center gap-2 rounded-[22px] px-8 text-base font-black text-white transition-transform hover:-translate-y-1 sm:h-16 sm:px-10 sm:text-lg"
              >
                {t("heroCtaContact")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/media"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-8 text-base font-black text-white backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 sm:h-16 sm:px-10 sm:text-lg"
              >
                {t("heroCtaBrowse")}
                <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        <NeonSection className="pb-20 pt-16 sm:pb-28 sm:pt-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <SectionHead
              number="01"
              category={t("listCategory")}
              title={t("listTitle")}
              meta={t("listMeta")}
            />
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("listLead")}
            </p>

            <div className="mt-12 grid gap-0">
              {packages.map((pkg, i) => (
                <PackageCard
                  key={pkg.slug}
                  pkg={pkg}
                  index={i}
                  isKo={isKo}
                  imagePreparingLabel={t("imagePreparing")}
                  quoteCtaLabel={t("quoteCta")}
                  mediaCountLabel={t("mediaCountLabel")}
                  includedMediaLabel={t("includedMediaPending")}
                />
              ))}
            </div>

            <div className="mt-16 border-2 border-border bg-card p-6 sm:p-8">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                {t("footerEyebrow")}
              </p>
              <p className="mt-3 text-lg font-bold tracking-tight text-foreground">
                {t("footerTitle")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t("footerBody")}</p>
              <Link
                href="/planner"
                className="mt-6 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent hover:underline"
              >
                {t("footerPlannerLink")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </NeonSection>
      </div>
    </HomeLandingDayNight>
  );
}
