import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { ContactNeonClient } from "./contact-neon-client";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const isKo = locale === "ko";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon">
        {/* Hero — 홈/서비스와 동일 네온 랜딩 쉘 */}
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pb-32 sm:pt-32 lg:px-8 lg:pb-44 lg:pt-40">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-col items-center gap-3">
                <span className="tkad-neon-border rounded-2xl bg-white/5 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/78 backdrop-blur">
                  <span className="tkad-home-accent-text">[ Contact ]</span>
                  <span className="text-white/55">{t("heroChipSuffix")}</span>
                </span>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                  {t("heroKicker")}
                </p>
              </div>

              <h1 className="mt-6 text-balance text-[clamp(44px,5.8vw,76px)] font-[950] leading-[0.92] tracking-[-0.065em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
                {t("title")}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
                {t("subtitle")}
              </p>

              <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/quote"
                  className="tkad-neon-cta-clean inline-flex h-16 items-center justify-center gap-2 rounded-[22px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
                >
                  {isKo ? "바로 견적 요청" : "Request a quote"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/media"
                  className="inline-flex h-16 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-10 text-base font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
                >
                  {isKo ? "매체 먼저 보기" : "Explore media"}
                  <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <ContactNeonClient />
      </div>
    </HomeLandingDayNight>
  );
}
