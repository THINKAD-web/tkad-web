import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  listPublishedReports,
  parseReportCategoryParam,
} from "@/lib/report-queries";
import {
  REPORT_CATEGORY_ORDER,
  labelForReportCategory,
} from "@/lib/report-category";
import { cn } from "@/lib/utils";
import type { ReportCategory } from "@prisma/client";
import { ContentNotifySignup } from "@/components/content-notify-signup";
import { ReportListHero } from "@/components/report/report-list-hero";

export const dynamic = "force-dynamic";

type SearchParams = { category?: string; page?: string };

function reportListHref(category: ReportCategory | null, page: number) {
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (page > 1) qs.set("page", String(page));
  const q = qs.toString();
  return q ? `/report?${q}` : "/report";
}

function thumbPlaceholderClass(category: ReportCategory): string {
  switch (category) {
    case "TREND":
      return "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-[#05050a]";
    case "REGION":
      return "bg-gradient-to-br from-sky-500 via-cyan-700 to-[#05050a]";
    case "GUIDE":
      return "bg-gradient-to-br from-amber-500 via-orange-700 to-[#05050a]";
    case "CAMPAIGN":
    default:
      return "bg-gradient-to-br from-emerald-600 via-teal-800 to-[#05050a]";
  }
}

function formatPublished(d: Date | null, locale: string): string {
  if (!d) return "—";
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ListProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

export default async function ReportListPage({ params, searchParams }: ListProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const sp = await searchParams;
  const category = parseReportCategoryParam(
    typeof sp.category === "string" ? sp.category : null,
  );
  const pageRaw = Number(sp.page ?? "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const { reports, total, page: curPage, pageSize } = await listPublishedReports({
    category,
    page,
    pageSize: 20,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const globalEmpty = total === 0 && !category && curPage === 1;

  const filterPill = (active: boolean) =>
    cn(
      "inline-flex items-center justify-center rounded-full px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] transition-all",
      active
        ? "tkad-neon-cta text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)]"
        : "border border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/80 dark:border-white/12 dark:bg-white/6 dark:text-white/90 dark:hover:border-white/22 dark:hover:bg-white/10",
    );

  const cardShell =
    "group flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_100px_rgba(0,0,0,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/12 dark:bg-white/6 dark:shadow-[0_28px_120px_rgba(0,0,0,0.45)] dark:backdrop-blur-md dark:hover:border-white/18";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <ReportListHero />


        <section className="border-b border-border bg-muted/30 py-8 dark:border-white/10 dark:bg-[#070712]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link href={reportListHref(null, 1)} className={filterPill(!category)}>
                {isKo ? "전체" : "All"}
              </Link>
              {REPORT_CATEGORY_ORDER.map((cat) => (
                <Link
                  key={cat}
                  href={reportListHref(cat, 1)}
                  className={filterPill(category === cat)}
                >
                  {labelForReportCategory(cat, isKo)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-background py-12 text-foreground sm:py-16 dark:bg-[#030308]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {reports.length === 0 ? (
              <div className="mx-auto max-w-xl rounded-[28px] border border-border bg-card p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.08)] dark:border-white/12 dark:bg-white/6 dark:backdrop-blur-md dark:shadow-[0_36px_140px_rgba(0,0,0,0.72)]">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                  [ {isKo ? "준비 중" : "Coming soon"} ]
                </p>
                <p className="mt-4 text-lg font-bold text-foreground">
                  {globalEmpty
                    ? isKo
                      ? "곧 첫 번째 리포트가 발행됩니다"
                      : "The first report is on the way"
                    : isKo
                      ? "이 카테고리에 아직 공개된 리포트가 없습니다"
                      : "No published reports in this category yet"}
                </p>
                {globalEmpty ? (
                  <div className="mt-8 text-left">
                    <ContentNotifySignup source="report" />
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                  {reports.map((r) => (
                    <Link key={r.id} href={`/report/${r.slug}`} className={cardShell}>
                      <div
                        className={cn(
                          "relative aspect-[16/9] w-full overflow-hidden border-b border-border dark:border-white/10",
                          r.thumbnail ? "" : thumbPlaceholderClass(r.category),
                        )}
                      >
                        {r.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.thumbnail}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-end p-4">
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
                              THINKAD REPORT
                            </span>
                          </div>
                        )}
                      </div>
                      <article className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary dark:border-white/15 dark:bg-white/10 dark:text-white/90">
                            {labelForReportCategory(r.category, isKo)}
                          </span>
                          <time
                            dateTime={r.publishedAt?.toISOString()}
                            className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                          >
                            {formatPublished(r.publishedAt, locale)}
                          </time>
                        </div>
                        <h2 className="line-clamp-2 text-xl font-bold leading-snug tracking-tight text-foreground dark:text-white">
                          {r.title}
                        </h2>
                        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground dark:text-white/70">
                          {r.summary}
                        </p>
                      </article>
                    </Link>
                  ))}
                </div>

                {totalPages > 1 ? (
                  <nav
                    className="mt-12 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-10 font-mono text-[12px] font-bold uppercase tracking-[0.14em] dark:border-white/10"
                    aria-label={isKo ? "페이지" : "Pagination"}
                  >
                    {curPage > 1 ? (
                      <Link
                        href={reportListHref(category, curPage - 1)}
                        className="rounded-full border border-border bg-card px-5 py-2.5 transition-colors hover:border-primary hover:bg-muted/60 dark:border-white/14 dark:bg-white/6 dark:text-white dark:hover:border-white/28 dark:hover:bg-white/10"
                      >
                        {isKo ? "이전" : "Prev"}
                      </Link>
                    ) : null}
                    <span className="px-2 text-muted-foreground">
                      {curPage} / {totalPages}
                    </span>
                    {curPage < totalPages ? (
                      <Link
                        href={reportListHref(category, curPage + 1)}
                        className="rounded-full border border-border bg-card px-5 py-2.5 transition-colors hover:border-primary hover:bg-muted/60 dark:border-white/14 dark:bg-white/6 dark:text-white dark:hover:border-white/28 dark:hover:bg-white/10"
                      >
                        {isKo ? "다음" : "Next"}
                      </Link>
                    ) : null}
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
