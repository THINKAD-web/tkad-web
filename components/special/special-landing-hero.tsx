import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { CategoryHeroBetaBadge } from "@/components/category-explore-hero";

const HEADLINE_GRADIENT =
  "bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent";

type Cta = { href: string; label: string };

export function SpecialLandingHero({
  eyebrow,
  headlineBefore,
  headlineGradient,
  headlineAfter,
  subtitle,
  icon,
  primaryCta,
  secondaryCta,
}: {
  eyebrow: string;
  headlineBefore: string;
  headlineGradient: string;
  headlineAfter?: string;
  subtitle: string;
  icon: string;
  primaryCta: Cta;
  secondaryCta: Cta;
}) {
  return (
    <section className="tkad-home-hero tkad-category-explore-hero relative overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#05050a] dark:text-white">
      <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
      <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
      <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pb-36 lg:pt-32">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-400/60">
          <span>{eyebrow}</span>
          <CategoryHeroBetaBadge />
        </p>

        <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border dark:border-white/15 border-gray-200 dark:bg-white/8 bg-gray-100 text-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
            {icon}
          </div>
          <h1 className="max-w-4xl text-balance text-[clamp(28px,4.2vw,52px)] font-[950] leading-[1.08] tracking-[-0.055em] dark:text-white text-gray-900 [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
            {headlineBefore}
            <br />
            <span className={HEADLINE_GRADIENT}>{headlineGradient}</span>
            {headlineAfter ? (
              <>
                <br />
                {headlineAfter}
              </>
            ) : null}
          </h1>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-base leading-relaxed dark:text-white/90 text-gray-800 sm:text-lg">
          {subtitle}
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={primaryCta.href}
            className="tkad-neon-cta-clean inline-flex h-14 min-h-14 items-center justify-center gap-2 rounded-[22px] px-8 text-sm font-black dark:text-white text-gray-900 transition-transform hover:-translate-y-1 sm:h-16 sm:px-10 sm:text-base"
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex h-14 min-h-14 items-center justify-center gap-2 rounded-[22px] border dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 px-8 text-sm font-black dark:text-white text-gray-900 backdrop-blur transition-ui hover:-translate-y-1 hover:border-white/22 hover:dark:bg-white/10 sm:h-16 sm:px-10 sm:text-base"
          >
            {secondaryCta.label}
            <ArrowRight className="h-4 w-4 dark:text-white text-gray-700" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
