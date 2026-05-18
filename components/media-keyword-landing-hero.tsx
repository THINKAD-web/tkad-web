import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { CategoryHeroBetaBadge } from "@/components/category-explore-hero";

type Cta = { href: string; label: string };

/**
 * `/media/region|type|area/*` 키워드 랜딩 — 메인 `/media` 네온 히어로와 동일 쉘.
 */
export function MediaKeywordLandingHero({
  eyebrow,
  title,
  description,
  icon,
  primaryCta,
  secondaryCta,
  showBeta = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  primaryCta: Cta;
  secondaryCta: Cta;
  showBeta?: boolean;
}) {
  return (
    <section className="tkad-home-hero tkad-category-explore-hero relative overflow-hidden bg-[#05050a] text-white">
      <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
      <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
      />

      <div className="tkad-media-keyword-hero relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pb-36 lg:pt-32">
        <p className="tkad-media-keyword-hero__eyebrow flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400/60">
          <span>{eyebrow}</span>
          {showBeta ? <CategoryHeroBetaBadge /> : null}
        </p>

        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-6">
          <div className="tkad-media-keyword-hero-icon flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
            {icon}
          </div>
          <h1 className="max-w-4xl text-balance text-[clamp(28px,4.2vw,52px)] font-[950] leading-[1.05] tracking-[-0.055em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
            {title}
          </h1>
        </div>

        <p className="tkad-media-keyword-hero__body mx-auto mt-8 max-w-3xl text-base leading-relaxed text-white/82 sm:text-lg">
          {description}
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={primaryCta.href}
            className="tkad-neon-cta-clean inline-flex h-14 min-h-14 items-center justify-center gap-2 rounded-[22px] px-8 text-sm font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-16 sm:px-10 sm:text-base"
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-14 min-h-14 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-8 text-sm font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-16 sm:px-10 sm:text-base"
          >
            {secondaryCta.label}
            <ArrowRight className="h-4 w-4 text-white/80" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
