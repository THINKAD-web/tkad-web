import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
      return "bg-gradient-to-br from-[#FF6600] via-orange-600 to-neutral-900";
    case "REGION":
      return "bg-gradient-to-br from-sky-600 via-blue-900 to-neutral-950";
    case "GUIDE":
      return "bg-gradient-to-br from-amber-500 via-yellow-700 to-neutral-900";
    case "CAMPAIGN":
    default:
      return "bg-gradient-to-br from-emerald-600 via-teal-900 to-neutral-950";
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

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b-2 border-black bg-hero-void py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
            [ Report ] / Trend // ooh industry insight
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl lg:text-5xl">
            {isKo ? "OOH 트렌드 리포트" : "OOH trend reports"}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-hero-fg/85 sm:text-lg">
            {isKo
              ? "광고 업계 인사이트와 매체 트렌드를 정리합니다"
              : "Industry insight and OOH media trends, curated for marketers."}
          </p>
        </div>
      </section>

      <section className="border-b-2 border-black bg-muted/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            <Link
              href={reportListHref(null, 1)}
              className={cn(
                "inline-flex border-2 border-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all",
                !category
                  ? "bg-black text-white shadow-[4px_4px_0_0_rgb(255,102,0)]"
                  : "bg-card text-foreground hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgb(0,0,0)]",
              )}
            >
              {isKo ? "전체" : "All"}
            </Link>
            {REPORT_CATEGORY_ORDER.map((cat) => (
              <Link
                key={cat}
                href={reportListHref(cat, 1)}
                className={cn(
                  "inline-flex border-2 border-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all",
                  category === cat
                    ? "bg-black text-white shadow-[4px_4px_0_0_rgb(255,102,0)]"
                    : "bg-card text-foreground hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgb(0,0,0)]",
                )}
              >
                {labelForReportCategory(cat, isKo)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {reports.length === 0 ? (
          <div className="mx-auto max-w-xl border-2 border-black bg-card p-10 text-center shadow-[6px_8px_0_0_rgb(0,0,0)]">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
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
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              {reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/report/${r.slug}`}
                  className={cn(
                    "group flex h-full flex-col overflow-hidden border-2 border-black bg-card text-card-foreground shadow-[4px_4px_0_0_rgb(0,0,0)] transition-all duration-200",
                    "hover:-translate-y-[2px] hover:shadow-[6px_8px_0_0_rgb(0,0,0)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6600] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                >
                  <div
                    className={cn(
                      "relative aspect-[16/9] w-full overflow-hidden border-b-2 border-black",
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
                  <article className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex border-2 border-black bg-[#FF6600] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                        {labelForReportCategory(r.category, isKo)}
                      </span>
                      <time
                        dateTime={r.publishedAt?.toISOString()}
                        className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        {formatPublished(r.publishedAt, locale)}
                      </time>
                    </div>
                    <h2 className="line-clamp-2 text-xl font-bold leading-snug tracking-tight text-foreground">
                      {r.title}
                    </h2>
                    <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {r.summary}
                    </p>
                  </article>
                </Link>
              ))}
            </div>

            {totalPages > 1 ? (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t-2 border-black/10 pt-8 font-mono text-[12px] font-bold uppercase tracking-[0.14em]"
                aria-label={isKo ? "페이지" : "Pagination"}
              >
                {curPage > 1 ? (
                  <Link
                    href={reportListHref(category, curPage - 1)}
                    className="border-2 border-black bg-card px-4 py-2 transition-colors hover:bg-black hover:text-white"
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
                    className="border-2 border-black bg-card px-4 py-2 transition-colors hover:bg-black hover:text-white"
                  >
                    {isKo ? "다음" : "Next"}
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
