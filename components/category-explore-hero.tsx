import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const HEADLINE_GRADIENT =
  "bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent";

export type CategoryExploreHeroProps = {
  /** e.g. `// 01 · MEDIA` */
  code: string;
  headlineBefore: string;
  headlineGradient: string;
  headlineAfter?: string;
  subtitle: string;
  children?: ReactNode;
  className?: string;
};

/**
 * 매체 탐색·콘텐츠 카테고리 페이지 공통 네온 히어로 (중앙 정렬).
 */
export function CategoryExploreHero({
  code,
  headlineBefore,
  headlineGradient,
  headlineAfter = "",
  subtitle,
  children,
  className,
}: CategoryExploreHeroProps) {
  return (
    <section
      className={cn(
        "tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white",
        className,
      )}
    >
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
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <p className="font-mono text-sm font-medium tracking-widest text-cyan-400/60">
          {code}
        </p>
        <h1 className="mt-4 max-w-4xl text-balance text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl">
          {headlineBefore}
          <span className={HEADLINE_GRADIENT}>{headlineGradient}</span>
          {headlineAfter}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/50">{subtitle}</p>
        {children ? <div className="mt-8 w-full">{children}</div> : null}
      </div>
    </section>
  );
}
