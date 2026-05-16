import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Heart, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
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

  return (
    <div className="min-h-screen bg-background">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <nav className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Link href="/report" className="transition-colors hover:text-primary">
            {isKo ? "← 트렌드 리포트 목록" : "← Trend reports"}
          </Link>
        </nav>

        <header className="space-y-4 border-b-2 border-black pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex border-2 border-black bg-[#FF6600] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              {labelForReportCategory(row.category, isKo)}
            </span>
            <time
              dateTime={row.publishedAt?.toISOString()}
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              {formatPublished(row.publishedAt, locale)}
            </time>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {row.title}
          </h1>
        </header>

        {row.thumbnail ? (
          <div className="mt-8 overflow-hidden border-2 border-black shadow-[4px_4px_0_0_rgb(0,0,0)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.thumbnail}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        <div className="mt-10 border-2 border-black bg-card p-6 sm:p-8">
          <InsightMarkdownBody markdown={row.content} />
        </div>

        <div className="mt-12 border-t-2 border-black pt-10">
          <Link
            href="/report"
            className="inline-flex border-2 border-black bg-foreground px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-background transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgb(255,102,0)]"
          >
            {isKo ? "다른 리포트 보기" : "More reports"}
          </Link>
        </div>

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#FF6600]">
              {isKo ? "관련 커뮤니티 글" : "Related community posts"}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {related.map((post) => {
                const labels = COMMUNITY_CATEGORY_LABELS[post.category];
                return (
                  <Link
                    key={post.id}
                    href={`/community/post/${post.id}`}
                    className={cn(
                      "group block border-2 border-black bg-card p-4 shadow-[4px_4px_0_0_rgb(0,0,0)] transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-[6px_8px_0_0_rgb(0,0,0)]",
                    )}
                  >
                    <span className="inline-flex border-2 border-black bg-[#FF6600] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                      {isKo ? labels.shortKo : labels.en}
                    </span>
                    <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-foreground">
                      {post.title}
                    </h3>
                    <div className="mt-4 flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Heart className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden />
                        {post.likeCount}
                      </span>
                      <span className="inline-flex items-center gap-1 text-foreground">
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
      </article>
    </div>
  );
}
