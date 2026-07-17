import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui-classes";
import { StatusBadge } from "@/components/ui/status-badge";

const HEADLINE_GRADIENT =
  "bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent";

/** `/media/packages` 히어로 CTA와 동일한 스타일 토큰 */
export const categoryHeroCtaPrimaryClass = cn(
  "category-hero-cta-primary tkad-qp-cta",
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-95 active:scale-95 md:text-base",
  "shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--qp-accent)]/40 focus-visible:ring-offset-2",
);

export const categoryHeroCtaSecondaryClass = cn(
  "category-hero-cta-secondary",
  ui.btnSecondary,
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 dark:focus-visible:ring-white/40",
);

/** packages 히어로 통계 카드 */
export const categoryHeroStatCardClass = cn(
  "category-hero-stat-card ui-card-text",
  ui.cardLight,
  ui.cardPadSm,
);

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
        "flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type CategoryExploreHeroProps = {
  code: string;
  headlineBefore: string;
  headlineGradient: string;
  headlineAfter?: string;
  subtitle: string;
  children?: ReactNode;
  className?: string;
  compactOnMobile?: boolean;
  showBeta?: boolean;
};

export function CategoryHeroBetaBadge({ className }: { className?: string }) {
  return (
    <StatusBadge variant="beta" className={cn("category-hero-beta-badge shrink-0", className)}>
      <span aria-hidden className="mr-1 not-italic">
        ✨
      </span>
      BETA
    </StatusBadge>
  );
}

function CategoryHeroCodeLine({ code, showBeta }: { code: string; showBeta?: boolean }) {
  return (
    <p className={cn("ui-section-label flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-0 ")}>
      <span>{code}</span>
      {showBeta ? <CategoryHeroBetaBadge /> : null}
    </p>
  );
}

/**
 * 매체·콘텐츠 카테고리 공통 히어로 — 라이트: 밝은 배경 / 다크: 네온 풀블리드.
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
  showBeta = false,
}: CategoryExploreHeroProps) {
  return (
    <section
      className={cn(
        "tkad-home-hero tkad-category-explore-hero relative overflow-hidden bg-gradient-to-b from-gray-50 via-white to-white text-gray-900 dark:from-[#05050a] dark:via-[#05050a] dark:to-[#05050a] dark:bg-[#05050a] dark:text-white",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 tkad-neon-depth dark:opacity-100 opacity-0" />
      <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid dark:opacity-20 opacity-0" />
      <div
        aria-hidden
        className="absolute inset-0 tkad-hero-noise opacity-0 mix-blend-overlay dark:opacity-[0.07]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-100/80 dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
      />
      <div
        className={cn(
          "ui-container relative flex flex-col items-center text-center md:items-start md:text-left",
          compactOnMobile
            ? "px-4 pb-6 pt-8 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24"
            : "px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24",
        )}
      >
        <CategoryHeroCodeLine code={code} showBeta={showBeta} />
        <h1
          className={cn(
            "ui-page-headline mt-4 max-w-4xl text-balance",
            compactOnMobile && "text-2xl sm:text-4xl md:text-6xl",
          )}
        >
          {headlineBefore}
          <span className={HEADLINE_GRADIENT}>{headlineGradient}</span>
          {headlineAfter}
        </h1>
        <p
          className={cn(
            "ui-body mx-auto max-w-xl md:mx-0",
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
