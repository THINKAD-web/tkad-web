import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Heart, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { getPublishedReportBySlug } from "@/lib/report-queries";
import { labelForReportCategory } from "@/lib/report-category";
import { listRelatedCommunityPostsForReport } from "@/lib/report-related-community";
import { COMMUNITY_CATEGORY_LABELS } from "@/lib/community/types";
import { cn } from "@/lib/utils";
import { InsightMarkdownBody } from "@/components/insights/markdown-body";
import { pageAlternates, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string; slug: string }> };

function formatPublished(d: Date | null, locale: string): string {
  if (!d) return "—";
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const isKo = locale === "ko";
  const row = await getPublishedReportBySlug(slug);
  if (!row) {
    return { title: isKo ? "리포트 없음 | THINKAD" : "Report not found | THINKAD" };
  }
  const url = `${siteUrl}/${locale}/report/${slug}`;
  return {
    title: `${row.title} | THINKAD`,
    description: row.summary.slice(0, 220),
    alternates: pageAlternates(locale, `/report/${slug}`),
    robots: isKo ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: row.title,
      description: row.summary.slice(0, 200),
      url,
      type: "article",
      publishedTime: row.publishedAt?.toISOString(),
      modifiedTime: row.updatedAt.toISOString(),
      siteName: "THINKAD",
    },
    twitter: {
      card: "summary_large_image",
      title: row.title,
      description: row.summary.slice(0, 200),
    },
  };
}

export default async function ReportDetailPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const row = await getPublishedReportBySlug(slug);
  if (!row) notFound();

  const related = await listRelatedCommunityPostsForReport(row.category);

  const relatedCard =
    "group block rounded-[28px] border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_100px_rgba(0,0,0,0.12)] dark:border-white/12 dark:bg-white/6 dark:backdrop-blur-md dark:shadow-[0_24px_80px_rgba(0,0,0,0.4)] dark:hover:border-white/18";

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 tkad-neon-grid"
          />
          <div
            aria-hidden
            className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.75),rgba(0,0,0,0.95))]"
          />
          <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
            <nav className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
              <Link href="/report" className="transition-colors hover:text-white">
                {isKo ? "← 트렌드 리포트 목록" : "← Trend reports"}
              </Link>
            </nav>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                <span className="tkad-home-accent-text">Report</span>
              </span>
              <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                {labelForReportCategory(row.category, isKo)}
              </span>
            </div>
            <time
              dateTime={row.publishedAt?.toISOString()}
              className="mt-5 block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55"
            >
              {formatPublished(row.publishedAt, locale)}
            </time>
            <h1 className="mt-4 text-balance text-3xl font-[950] leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              {row.title}
            </h1>
          </div>
        </section>

        <article className="bg-background text-foreground dark:bg-[#030308]">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
            {row.thumbnail ? (
              <div className="overflow-hidden rounded-[28px] border border-border shadow-[0_24px_80px_rgba(0,0,0,0.1)] dark:border-white/12 dark:shadow-[0_36px_120px_rgba(0,0,0,0.55)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.thumbnail}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            ) : null}

            <div
              className={cn(
                "mt-10 rounded-[28px] border border-border bg-card p-6 sm:p-8",
                "dark:border-white/12 dark:bg-white/6 dark:backdrop-blur-md",
              )}
            >
              <InsightMarkdownBody markdown={row.content} />
            </div>

            <div className="mt-12 border-t border-border pt-10 dark:border-white/10">
              <Link
                href="/report"
                className="tkad-neon-cta-clean inline-flex h-14 items-center justify-center rounded-[22px] px-8 text-sm font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-base"
              >
                {isKo ? "다른 리포트 보기" : "More reports"}
              </Link>
            </div>

            {related.length > 0 ? (
              <section className="mt-14">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                  {isKo ? "관련 커뮤니티 글" : "Related community posts"}
                </h2>
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {related.map((post) => {
                    const labels = COMMUNITY_CATEGORY_LABELS[post.category];
                    return (
                      <Link
                        key={post.id}
                        href={`/community/post/${post.id}`}
                        className={relatedCard}
                      >
                        <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary dark:border-white/15 dark:bg-white/10 dark:text-white/90">
                          {isKo ? labels.shortKo : labels.en}
                        </span>
                        <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-foreground dark:text-white">
                          {post.title}
                        </h3>
                        <div className="mt-4 flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          <span className="inline-flex items-center gap-1 text-foreground dark:text-white">
                            <Heart
                              className="h-3.5 w-3.5 text-primary dark:text-cyan-300"
                              aria-hidden
                            />
                            {post.likeCount}
                          </span>
                          <span className="inline-flex items-center gap-1 text-foreground dark:text-white">
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                            {post.commentCount}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </article>
      </div>
    </HomeLandingDayNight>
  );
}
