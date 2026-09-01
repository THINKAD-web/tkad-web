import { PageContainer } from "@/components/layout/page-container";

export interface PageHeroProps {
  eyebrow: string;
  title: string;
  highlight: string;
  titleEnd?: string;
  description: string;
  /** Quiet-professional beta chip — use once in listing heroes only */
  showBeta?: boolean;
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  titleEnd,
  description,
  showBeta = false,
}: PageHeroProps) {
  return (
    <PageContainer className="pt-6 pb-4">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-xs tracking-widest uppercase text-[color:var(--qp-fg-muted)]">
        <span>{eyebrow}</span>
        {showBeta ? (
          <span className="inline-flex items-center rounded-full border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent)]/10 px-2 py-0.5 tkad-type-note font-semibold tracking-[0.14em] text-[color:var(--qp-accent)] normal-case">
            Beta
          </span>
        ) : null}
      </p>
      <h1 className="mb-2 text-3xl font-bold leading-tight text-gray-900 dark:text-white md:text-4xl">
        {title}
        <span className="text-[color:var(--qp-accent)]">{highlight}</span>
        {titleEnd}
      </h1>
      <p className="text-sm text-gray-500 dark:text-white/50">{description}</p>
    </PageContainer>
  );
}
