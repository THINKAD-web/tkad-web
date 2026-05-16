import { setRequestLocale } from "next-intl/server";
import { Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  listPublishedAcademyArticles,
  parseAcademyCategoryParam,
} from "@/lib/academy-article-queries";
import {
  ACADEMY_CATEGORY_ORDER,
  labelForAcademyCategory,
} from "@/lib/academy-article-category";
import { cn } from "@/lib/utils";
import type { AcademyArticleCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = { category?: string; page?: string };

function academyListHref(category: AcademyArticleCategory | null, page: number) {
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (page > 1) qs.set("page", String(page));
  const q = qs.toString();
  return q ? `/academy?${q}` : "/academy";
}

function thumbPlaceholderClass(category: AcademyArticleCategory): string {
  switch (category) {
    case "BASICS":
      return "bg-gradient-to-br from-[#FF6600] via-orange-600 to-neutral-900";
    case "MEDIA_GUIDE":
      return "bg-gradient-to-br from-violet-600 via-purple-900 to-neutral-950";
    case "BUDGET":
      return "bg-gradient-to-br from-amber-500 via-yellow-700 to-neutral-900";
    case "EXECUTION":
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

export default async function AcademyListPage({ params, searchParams }: ListProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const sp = await searchParams;
  const category = parseAcademyCategoryParam(
    typeof sp.category === "string" ? sp.category : null,
  );
  const pageRaw = Number(sp.page ?? "1");
  const page =
    Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;

  const { articles, total, page: curPage, pageSize, usingDemo } =
    await listPublishedAcademyArticles({ category, page, pageSize: 20 });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const globalEmpty = total === 0 && !category && curPage === 1;

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b-2 border-black bg-hero-void py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
            [ Academy ] / OOH education // thinkad
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl lg:text-5xl">
            {isKo ? "OOH 광고 아카데미" : "OOH advertising academy"}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-hero-fg/85 sm:text-lg">
            {isKo
              ? "옥외광고 기초부터 매체 선정·예산·집행까지, 광고 초보도 따라 할 수 있는 가이드입니다."
              : "From OOH basics to media, budget, and execution—guides for first-time advertisers."}
          </p>
          <p className="mt-6">
            <Link
              href="/academy/learn"
              className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-hero-fg/80 underline decoration-[#FF6600] underline-offset-4 hover:text-[#FF6600]"
            >
              {isKo ? "동영상 강의 · 웨비나 →" : "Video lessons & webinars →"}
            </Link>
          </p>
        </div>
      </section>

      {usingDemo ? (
        <div className="border-b-2 border-black bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
          <p className="mx-auto max-w-7xl font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900 dark:text-amber-200">
            {isKo
              ? "샘플 콘텐츠로 UI를 표시 중입니다. DB 연결 후 실제 아티클이 노출됩니다."
              : "Showing sample articles for preview."}
          </p>
        </div>
      ) : null}

      <section className="border-b-2 border-black bg-muted/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            <Link
              href={academyListHref(null, 1)}
              className={cn(
                "inline-flex border-2 border-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all",
                !category
                  ? "bg-black text-white shadow-[4px_4px_0_0_rgb(255,102,0)]"
                  : "bg-card text-foreground hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgb(0,0,0)]",
              )}
            >
              {isKo ? "전체" : "All"}
            </Link>
            {ACADEMY_CATEGORY_ORDER.map((cat) => (
              <Link
                key={cat}
                href={academyListHref(cat, 1)}
                className={cn(
                  "inline-flex border-2 border-black px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-all",
                  category === cat
                    ? "bg-black text-white shadow-[4px_4px_0_0_rgb(255,102,0)]"
                    : "bg-card text-foreground hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgb(0,0,0)]",
                )}
              >
                {labelForAcademyCategory(cat, isKo)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {articles.length === 0 ? (
          <div className="mx-auto max-w-xl border-2 border-black bg-card p-10 text-center shadow-[6px_8px_0_0_rgb(0,0,0)]">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              [ {isKo ? "준비 중" : "Coming soon"} ]
            </p>
            <p className="mt-4 text-lg font-bold text-foreground">
              {globalEmpty
                ? isKo
                  ? "곧 첫 번째 가이드가 발행됩니다"
                  : "The first guide is on the way"
                : isKo
                  ? "이 카테고리에 아직 공개된 아티클이 없습니다"
                  : "No published articles in this category yet"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={`/academy/${a.slug}`}
                  className={cn(
                    "group flex h-full flex-col overflow-hidden border-2 border-black bg-card shadow-[4px_4px_0_0_rgb(0,0,0)] transition-all duration-200",
                    "hover:-translate-y-[2px] hover:shadow-[6px_8px_0_0_rgb(0,0,0)]",
                  )}
                >
                  <div
                    className={cn(
                      "relative aspect-[16/9] w-full overflow-hidden border-b-2 border-black",
                      a.thumbnail ? "" : thumbPlaceholderClass(a.category),
                    )}
                  >
                    {a.thumbnail ? (
                      <img
                        src={a.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-end p-4">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/90">
                          THINKAD ACADEMY
                        </span>
                      </div>
                    )}
                  </div>
                  <article className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex border-2 border-black bg-[#FF6600] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                        {labelForAcademyCategory(a.category, isKo)}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <time dateTime={a.publishedAt?.toISOString()}>
                          {formatPublished(a.publishedAt, locale)}
                        </time>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-3 w-3" aria-hidden />
                          {isKo ? `${a.readMinutes}분` : `${a.readMinutes}m`}
                        </span>
                      </div>
                    </div>
                    <h2 className="line-clamp-2 text-xl font-bold leading-snug text-foreground">
                      {a.title}
                    </h2>
                    <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {a.summary}
                    </p>
                  </article>
                </Link>
              ))}
            </div>

            {totalPages > 1 ? (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-2 border-t-2 border-black/10 pt-8 font-mono text-[12px] font-bold uppercase"
                aria-label={isKo ? "페이지" : "Pagination"}
              >
                {curPage > 1 ? (
                  <Link
                    href={academyListHref(category, curPage - 1)}
                    className="border-2 border-black bg-card px-4 py-2 hover:bg-black hover:text-white"
                  >
                    {isKo ? "이전" : "Prev"}
                  </Link>
                ) : null}
                <span className="px-2 text-muted-foreground">
                  {curPage} / {totalPages}
                </span>
                {curPage < totalPages ? (
                  <Link
                    href={academyListHref(category, curPage + 1)}
                    className="border-2 border-black bg-card px-4 py-2 hover:bg-black hover:text-white"
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
