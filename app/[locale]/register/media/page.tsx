import { setRequestLocale } from "next-intl/server";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import type { Metadata } from "next";
import { pageAlternates } from "@/lib/seo";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaRegisterNeonClient } from "./media-register-neon-client";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const isKo = locale === "ko";
  return {
    title: isKo
      ? "매체 등록 신청 | THINKAD"
      : "Register your media | THINKAD",
    description: isKo
      ? "매체사 셀프 등록 신청 — 싱커드 심사 후 카탈로그에 노출됩니다."
      : "Submit your OOH media for THINKAD review and catalog listing.",
    alternates: pageAlternates(locale, "/register/media"),
    robots: { index: true, follow: true },
  };
}

export default async function MediaRegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon bg-[#0A0A0A]">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div
            aria-hidden
            className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 text-center sm:px-6 sm:pb-28 sm:pt-32 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-col items-center gap-3">
                <span className="tkad-neon-border rounded-2xl bg-white/5 px-4 py-2 font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/78 backdrop-blur">
                  <span className="tkad-home-accent-text">
                    [ {isKo ? "신규 매체" : "New media"} ]
                  </span>
                  <span className="text-white/55">
                    {isKo ? " / 셀프 등록" : " / Self registration"}
                  </span>
                </span>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                  {isKo ? "MEDIA PARTNER" : "MEDIA PARTNER"}
                </p>
              </div>

              <h1 className="mt-6 text-balance text-[clamp(36px,5vw,56px)] font-[950] leading-[0.95] tracking-[-0.06em] text-white">
                {isKo ? "매체 등록 신청" : "Register your OOH media"}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
                {isKo
                  ? "신규 매체가 있으신가요? 싱커드 검증 후 THINKAD 카탈로그에 노출됩니다."
                  : "List new inventory with THINKAD — verified media for advertisers nationwide."}
              </p>

              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                <a
                  href="#register-form"
                  className="tkad-neon-cta-clean inline-flex h-14 items-center justify-center gap-2 rounded-[22px] px-8 text-sm font-black text-white transition-transform hover:-translate-y-1 sm:text-base"
                >
                  {isKo ? "신청서 작성" : "Start application"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
                <Link
                  href="/contact"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-8 text-sm font-black text-white backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 sm:text-base"
                >
                  {isKo ? "문의하기" : "Contact us"}
                  <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div id="register-form">
          <MediaRegisterNeonClient />
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
