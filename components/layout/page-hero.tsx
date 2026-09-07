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
      <p className="tkad-type-label mb-2 flex flex-wrap items-center gap-2">
        <span>{eyebrow}</span>
        {showBeta ? (
          <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-accent normal-case">
            Beta
          </span>
        ) : null}
      </p>
      <h1 className="mb-2 text-3xl font-bold leading-tight text-foreground md:text-4xl">
        {title}
        <span className="text-accent">{highlight}</span>
        {titleEnd}
      </h1>
      <p className="tkad-type-body text-muted-foreground">{description}</p>
    </PageContainer>
  );
}
