import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const HEADLINE_GRADIENT =
  "bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent";

/** `/media/packages` 히어로 CTA와 동일한 스타일 토큰 */
export const categoryHeroCtaPrimaryClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-7 text-sm font-bold text-white shadow-[0_18px_48px_rgba(139,92,246,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export const categoryHeroCtaSecondaryClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/6 px-7 text-sm font-bold text-white transition-colors hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

export function CategoryHeroCtaRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type CategoryExploreHeroProps = {
  /** e.g. `// 01 · MEDIA` */
  code: string;
  headlineBefore: string;
  headlineGradient: string;
  headlineAfter?: string;
  subtitle: string;
  children?: ReactNode;
  className?: string;
  /** 모바일에서 코드·헤드라인만 슬림 표시 (지도 등) */
  compactOnMobile?: boolean;
};

/**
 * 매체 탐색·콘텐츠 카테고리 페이지 공통 네온 히어로 (중앙 정렬).
 * CTA·통계는 `CategoryHeroCtaRow` + packages 페이지와 동일 클래스 사용.
 */
export function CategoryExploreHero({
  code,
  headlineBefore,
  headlineGradient,
  headlineAfter = "",
  subtitle,
  children,
  className,
  compactOnMobile = false,
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
      <div
        className={cn(
          "relative mx-auto flex max-w-7xl flex-col items-center text-center",
          compactOnMobile
            ? "px-4 pb-6 pt-8 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24"
            : "px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24",
        )}
      >
        <p className="font-mono text-sm font-medium tracking-widest text-cyan-400/60">
          {code}
        </p>
        <h1
          className={cn(
            "mt-4 max-w-4xl text-balance font-bold leading-[1.08] tracking-tight text-white",
            compactOnMobile
              ? "text-2xl sm:text-4xl md:text-6xl"
              : "text-4xl md:text-6xl",
          )}
        >
          {headlineBefore}
          <span className={HEADLINE_GRADIENT}>{headlineGradient}</span>
          {headlineAfter}
        </h1>
        <p
          className={cn(
            "mx-auto max-w-xl text-lg text-white/50",
            compactOnMobile ? "mt-2 hidden sm:block" : "mt-4",
          )}
        >
          {subtitle}
        </p>
        {children ? (
          <div
            className={cn(
              "w-full",
              compactOnMobile ? "mt-4 hidden sm:block" : "mt-8",
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
