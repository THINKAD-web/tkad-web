import { Link } from "@/i18n/navigation";
import { getSeedPackagesForIndustry } from "@/lib/industry-package-links";
import type { IndustrySlug } from "@/lib/industry-landing";

type Props = {
  slug: IndustrySlug;
  locale: string;
};

export async function IndustryPackageLinks({ slug, locale }: Props) {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const packages = getSeedPackagesForIndustry(slug);
  if (packages.length === 0) return null;

  return (
    <section className="border-t border-border/80 bg-muted/50 py-12 sm:py-16">
      <div className="ui-container">
        <p className="tkad-type-title text-muted-foreground sm:text-sm">
          {isKo ? "추천 패키지" : "Recommended packages"}
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {isKo ? "업종 맞춤 OOH 패키지" : "Industry OOH packages"}
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {packages.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/media/packages/${encodeURIComponent(p.slug)}`}
                className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:border-accent hover:bg-muted"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          <Link
            href="/media/packages"
            className="tkad-type-label text-accent underline-offset-4 hover:underline"
          >
            {isKo ? "전체 패키지 보기 →" : "View all packages →"}
          </Link>
        </p>
      </div>
    </section>
  );
}
