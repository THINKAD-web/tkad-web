import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CategoryExploreHero } from "@/components/category-explore-hero";
import dynamic from "next/dynamic";
import type { LegalSection } from "@/lib/legal/launch-policy-templates";

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));

type Props = {
  locale: string;
  code: string;
  headlineBefore: string;
  headlineGradient: string;
  subtitle: string;
  sections: LegalSection[];
  relatedLinks?: Array<{ href: string; label: string }>;
};

export function LegalPolicyPage({
  locale,
  code,
  headlineBefore,
  headlineGradient,
  subtitle,
  sections,
  relatedLinks = [],
}: Props) {
  const isKo = locale === "ko";

  return (
    <HomeLandingDayNight>
      <CategoryExploreHero
        code={code}
        headlineBefore={headlineBefore}
        headlineGradient={headlineGradient}
        subtitle={subtitle}
      />
      <section className="bg-card py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <p className="mb-8 rounded-lg border-2 border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
              {isKo
                ? "본 문서는 법무팀 검토 전 임시 표준 템플릿입니다. 정식 버전으로 교체될 수 있습니다."
                : "This document is a provisional standard template pending legal review."}
            </p>
            {relatedLinks.length > 0 ? (
              <nav className="mb-10 flex flex-wrap gap-3 text-sm">
                {relatedLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            ) : null}
            <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
              {sections.map((sec) => (
                <div key={sec.title} className="mb-12">
                  <h2 className="mb-4 border-b-2 border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
                    {sec.title}
                  </h2>
                  {sec.paragraphs.map((p, i) => (
                    <p
                      key={`${sec.title}-${i}`}
                      className="text-foreground leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </ScrollAnimate>
        </div>
      </section>
    </HomeLandingDayNight>
  );
}
