import type { ReactNode } from "react";
import {
  BarChart3,
  Camera,
  ClipboardCheck,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import {
  GUARANTEE_BADGE_CRITERIA,
  GUARANTEE_CATEGORIES,
  type GuaranteeBadgeCriterion,
  type GuaranteeCategory,
} from "@/lib/guarantee-page-content";
import { cn } from "@/lib/utils";

const CRITERION_ICONS: Record<string, typeof BarChart3> = {
  executions: ClipboardCheck,
  reviews: Star,
  rating: TrendingUp,
  photos: Camera,
};

type Props = {
  isKo: boolean;
};

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((line) => (
        <li
          key={line}
          className="flex gap-3 text-sm leading-relaxed dark:text-white/85 text-gray-700"
        >
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--qp-accent)]/90"
            aria-hidden
          />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function HighlightBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed dark:text-amber-100/90 text-amber-950">
      {children}
    </div>
  );
}

function CategoryTitle({ category, isKo }: { category: GuaranteeCategory; isKo: boolean }) {
  const title = isKo ? category.titleKo : category.titleEn;
  const accent = isKo ? category.accentKo : category.accentEn;

  if (!accent || !title.includes(accent)) {
    return title;
  }

  const [before, after] = title.split(accent);
  return (
    <>
      {before}
      <span className="tkad-home-accent-text">{accent}</span>
      {after}
    </>
  );
}

function CriterionCard({
  criterion,
  index,
  isKo,
}: {
  criterion: GuaranteeBadgeCriterion;
  index: number;
  isKo: boolean;
}) {
  const Icon = CRITERION_ICONS[criterion.id] ?? ShieldCheck;

  return (
    <article className="rounded-[28px] border border-gray-200 bg-gray-50 p-6 backdrop-blur dark:border-white/12 dark:bg-white/6 sm:p-7">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white/55 text-gray-500">
          [{String(index + 1).padStart(2, "0")}]
        </span>
        <Icon className="h-6 w-6 text-[color:var(--qp-accent)]/90" aria-hidden />
      </div>
      <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--qp-accent)]/80">
        {isKo ? criterion.labelKo : criterion.labelEn}
      </p>
      <p className="mt-2 text-2xl font-black dark:text-white text-gray-900">
        {isKo ? criterion.valueKo : criterion.valueEn}
      </p>
      <p className="mt-3 text-sm leading-relaxed dark:text-white/70 text-gray-600">
        {isKo ? criterion.detailKo : criterion.detailEn}
      </p>
    </article>
  );
}

export function GuaranteeCategoryNav({ isKo }: Props) {
  return (
    <nav
      aria-label={isKo ? "성과 보증 정책 카테고리" : "Performance guarantee categories"}
      className="flex flex-wrap gap-2"
    >
      {GUARANTEE_CATEGORIES.map((category) => (
        <a
          key={category.id}
          href={`#${category.id}`}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
            "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100",
            "dark:border-white/12 dark:bg-white/5 dark:text-white/80 hover:dark:bg-white/10",
          )}
        >
          {isKo ? category.titleKo : category.titleEn}
        </a>
      ))}
    </nav>
  );
}

export function GuaranteePageSections({ isKo }: Props) {
  return (
    <>
      {GUARANTEE_CATEGORIES.map((category, index) => {
        const bullets = isKo ? category.bulletsKo : category.bulletsEn;
        const isLast = index === GUARANTEE_CATEGORIES.length - 1;

        return (
          <NeonSection
            key={category.id}
            id={category.id}
            tone="qp"
            className={cn(
              index === 0 ? "pt-10 pb-12 sm:pt-16 sm:pb-20" : "pt-4 pb-12 sm:pb-20",
              isLast && "pb-16 sm:pb-24",
            )}
          >
            <NeonSectionHead
              number={category.number}
              kicker={isKo ? category.kickerKo : category.kickerEn}
              title={<CategoryTitle category={category} isKo={isKo} />}
              meta={isKo ? category.metaKo : category.metaEn}
            />

            <div className="mx-auto max-w-3xl">
              {(isKo ? category.introKo : category.introEn) ? (
                <p className="text-sm leading-relaxed dark:text-white/80 text-gray-700 sm:text-base">
                  {isKo ? category.introKo : category.introEn}
                </p>
              ) : null}

              {category.showCriteria ? (
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {GUARANTEE_BADGE_CRITERIA.map((criterion, criterionIndex) => (
                    <CriterionCard
                      key={criterion.id}
                      criterion={criterion}
                      index={criterionIndex}
                      isKo={isKo}
                    />
                  ))}
                </div>
              ) : null}

              {bullets?.length ? <BulletList items={bullets} /> : null}

              {(isKo ? category.highlightKo : category.highlightEn) ? (
                <HighlightBox>
                  {isKo ? category.highlightKo : category.highlightEn}
                </HighlightBox>
              ) : null}
            </div>
          </NeonSection>
        );
      })}
    </>
  );
}
