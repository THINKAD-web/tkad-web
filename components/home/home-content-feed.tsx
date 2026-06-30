import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ContentCardGradientThumb } from "@/components/content/content-card-gradient-thumb";
import type { HomeReportItem } from "@/lib/report-queries";
import type { HomeCaseItem } from "@/lib/case-queries";

type Props = {
  reports: HomeReportItem[];
  cases: HomeCaseItem[];
  locale?: string;
};

type InsightItem =
  | {
      kind: "report";
      id: string;
      href: string;
      title: string;
      thumbnailUrl?: string;
      category?: string;
    }
  | {
      kind: "case";
      id: string;
      href: string;
      title: string;
      thumbnailUrl?: string;
      industry?: string;
    };

function buildInsightItems(
  reports: HomeReportItem[],
  cases: HomeCaseItem[],
): InsightItem[] {
  const reportItems: InsightItem[] = reports.slice(0, 3).map((item) => ({
    kind: "report",
    id: item.id,
    href: item.slug ? `/report/${item.slug}` : `/report/${item.id}`,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
    category: item.category,
  }));

  const caseItems: InsightItem[] = cases.slice(0, 3).map((item) => ({
    kind: "case",
    id: item.id,
    href: item.slug ? `/cases/${item.slug}` : `/cases/${item.id}`,
    title: item.title || item.brandName || "",
    thumbnailUrl: item.thumbnailUrl,
    industry: item.industry,
  }));

  return [...reportItems, ...caseItems];
}

/** G-4: 리포트·사례를 인사이트 한 줄(3+3)로 통합 */
export function HomeContentFeed({
  reports,
  cases,
  locale = "ko",
}: Props) {
  const isKo = locale.startsWith("ko");
  const items = buildInsightItems(reports, cases);

  if (items.length === 0) return null;

  return (
    <section className="border-t border-gray-100 py-4 dark:border-white/5">
      <div className="mb-3 flex items-center justify-between gap-3 px-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {isKo ? "인사이트" : "Insights"}
        </h3>
        <div className="flex shrink-0 items-center gap-2 text-xs font-medium tkad-home-accent-text">
          <Link href="/report" className="inline-flex items-center gap-0.5">
            {isKo ? "리포트" : "Reports"}
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
          <span className="text-gray-300 dark:text-white/20" aria-hidden>
            ·
          </span>
          <Link href="/cases" className="inline-flex items-center gap-0.5">
            {isKo ? "사례" : "Cases"}
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {items.map((item) => {
          const typeLabel =
            item.kind === "report"
              ? isKo
                ? "리포트"
                : "Report"
              : isKo
                ? "사례"
                : "Case";

          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5 sm:w-48"
            >
              <ContentCardGradientThumb
                thumbnailUrl={item.thumbnailUrl}
                alt={item.title}
                category={item.kind === "report" ? item.category : undefined}
                industry={item.kind === "case" ? item.industry : undefined}
                heightClass="h-24"
                badge={
                  <span className="tkad-type-note absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 font-semibold text-white backdrop-blur-sm">
                    {typeLabel}
                  </span>
                }
              />
              <div className="p-3">
                <p className="tkad-type-title line-clamp-1 text-foreground">
                  {item.title}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
