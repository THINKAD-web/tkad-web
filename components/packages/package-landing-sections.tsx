import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import type { PackageFaqItem, PackageGuideStep } from "@/lib/media-package-types";
import { buildPackageContactHref } from "@/lib/media-package-url";
import { cn } from "@/lib/utils";

export function PackageLandingHero({
  pkg,
  isKo,
}: {
  pkg: {
    slug: string;
    name: string;
    subtitle: string;
    description: string;
    heroColor: string;
    icon: string;
    badgeText: string | null;
    avgBudget: string | null;
  };
  isKo: boolean;
}) {
  const contactHref = buildPackageContactHref(pkg.slug, pkg.name);
  return (
    <section
      className={cn(
        "relative overflow-hidden text-white",
        "bg-gradient-to-br",
        pkg.heroColor,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
        {pkg.badgeText ? (
          <p className="tkad-type-label text-white/80">
            [ {pkg.badgeText} ]
          </p>
        ) : null}
        <div className="mt-4 text-5xl" aria-hidden>
          {pkg.icon}
        </div>
        <h1 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl">
          {pkg.name}
        </h1>
        <p className="mt-3 text-lg font-semibold text-white/90">{pkg.subtitle}</p>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
          {pkg.description}
        </p>
        {pkg.avgBudget ? (
          <p className="mt-4 text-sm font-medium text-white/75">{pkg.avgBudget}</p>
        ) : null}
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={contactHref}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[20px] bg-white px-8 text-sm font-black text-gray-900 shadow-lg transition-transform hover:-translate-y-0.5 sm:text-base"
          >
            {isKo ? "이 패키지로 견적 받기" : "Get a quote for this package"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/media/packages"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[20px] border border-white/30 bg-white/10 px-8 text-sm font-bold backdrop-blur transition-colors hover:bg-white/15 sm:text-base"
          >
            {isKo ? "다른 패키지 보기" : "Browse packages"}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PackageGuideSection({
  steps,
  isKo,
}: {
  steps: PackageGuideStep[];
  isKo: boolean;
}) {
  if (steps.length === 0) return null;
  return (
    <section className="border-t border-border/80 bg-muted/20 py-12 sm:py-16">
      <div className="ui-container max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {isKo ? "집행 가이드" : "Execution guide"}
        </h2>
        <ol className="mt-8 space-y-4">
          {steps.map((step) => (
            <li
              key={`${step.step}-${step.title}`}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hermes/15 text-sm font-black text-hermes">
                {step.step}
              </span>
              <div>
                <p className="font-bold text-foreground">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PackageIndustrySection({
  industries,
  isKo,
}: {
  industries: string[];
  isKo: boolean;
}) {
  if (industries.length === 0) return null;
  return (
    <section className="py-10 sm:py-12">
      <div className="ui-container max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {isKo ? "추천 업종" : "Recommended industries"}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {industries.map((label) => (
            <span
              key={label}
              className="inline-flex rounded-full border border-hermes/30 bg-hermes/15 px-3 py-1 text-sm font-medium text-hermes"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PackageBudgetSection({
  avgBudget,
  isKo,
}: {
  avgBudget: string | null;
  isKo: boolean;
}) {
  if (!avgBudget) return null;
  return (
    <section className="border-y border-border/80 bg-muted/30 py-10 sm:py-12">
      <div className="ui-container max-w-3xl text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {isKo ? "평균 예산" : "Typical budget"}
        </h2>
        <p className="mt-4 text-2xl font-black text-hermes">
          {avgBudget}
        </p>
      </div>
    </section>
  );
}

export function PackageFaqSection({
  items,
  isKo,
}: {
  items: PackageFaqItem[];
  isKo: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="py-12 sm:py-16">
      <div className="ui-container max-w-3xl">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">FAQ</h2>
        <dl className="mt-8 space-y-3">
          {items.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-3">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <dd className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </dd>
            </details>
          ))}
        </dl>
      </div>
    </section>
  );
}
