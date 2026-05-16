import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getPublishedAcademyArticleBySlug } from "@/lib/academy-article-queries";
import { labelForAcademyCategory } from "@/lib/academy-article-category";
import { listRelatedAcademyArticles } from "@/lib/academy-article-related";
import {
  extractAcademyToc,
  estimateAcademyReadMinutes,
} from "@/lib/academy-markdown";
import { pageAlternates, serializeJsonLd, siteUrl } from "@/lib/seo";
import {
  buildAcademyArticleJsonLd,
  buildAcademyBreadcrumbJsonLd,
} from "@/lib/structured-data";
import { AcademyMarkdownBody } from "@/components/academy/academy-markdown-body";
import { AcademyArticleToc } from "@/components/academy/academy-article-toc";
import { AcademyDetailSidebar } from "@/components/academy/academy-detail-sidebar";
import { AcademyArticleFooterCta } from "@/components/academy/academy-article-footer-cta";

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
  const row = await getPublishedAcademyArticleBySlug(slug);
  if (!row) {
    return {
      title: isKo ? "아티클 없음 | THINKAD" : "Article not found | THINKAD",
    };
  }
  const url = `${siteUrl}/${locale}/academy/${slug}`;
  return {
    title: `${row.title} | THINKAD Academy`,
    description: row.summary.slice(0, 220),
    alternates: pageAlternates(locale, `/academy/${slug}`),
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

export default async function AcademyArticlePage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const isKo = locale === "ko";
  const row = await getPublishedAcademyArticleBySlug(slug);
  if (!row) notFound();

  const toc = extractAcademyToc(row.content);
  const readMinutes = estimateAcademyReadMinutes(row.content);
  const related = await listRelatedAcademyArticles(slug, row.category, 3);
  const tags = "tags" in row && Array.isArray(row.tags) ? row.tags : [];

  const publishedIso =
    row.publishedAt?.toISOString() ?? row.updatedAt.toISOString();
  const jsonLd = [
    buildAcademyArticleJsonLd(
      {
        title: row.title,
        summary: row.summary,
        slug,
        publishedIso,
        thumbnail: row.thumbnail,
      },
      locale,
    ),
    buildAcademyBreadcrumbJsonLd({ title: row.title, slug }, locale),
  ];

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <nav className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <Link href="/academy" className="transition-colors hover:text-primary">
            {isKo ? "← OOH 아카데미 목록" : "← Academy"}
          </Link>
        </nav>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
          <article className="min-w-0">
            <header className="space-y-4 border-b-2 border-black pb-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex border-2 border-black bg-[#FF6600] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  {labelForAcademyCategory(row.category, isKo)}
                </span>
                <time
                  dateTime={row.publishedAt?.toISOString()}
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                >
                  {formatPublished(row.publishedAt, locale)}
                </time>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {isKo ? `약 ${readMinutes}분` : `~${readMinutes} min`}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {row.title}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                {row.summary}
              </p>
              {tags.length > 0 ? (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <li
                      key={tag}
                      className="border border-black/20 bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              ) : null}
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

            {toc.length > 0 ? (
              <div className="mt-8 lg:hidden">
                <AcademyArticleToc items={toc} isKo={isKo} />
              </div>
            ) : null}

            <div className="mt-8 border-2 border-black bg-card p-6 sm:p-8">
              <AcademyMarkdownBody markdown={row.content} />
            </div>

            <AcademyArticleFooterCta isKo={isKo} />

            <div className="mt-10 border-t-2 border-black pt-8">
              <Link
                href="/academy"
                className="inline-flex border-2 border-black bg-foreground px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-background transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgb(255,102,0)]"
              >
                {isKo ? "다른 가이드 보기" : "More guides"}
              </Link>
            </div>
          </article>

          <div className="space-y-6">
            {toc.length > 0 ? (
              <div className="hidden lg:block">
                <AcademyArticleToc items={toc} isKo={isKo} />
              </div>
            ) : null}
            <AcademyDetailSidebar isKo={isKo} related={related} />
          </div>
        </div>
      </div>
    </div>
  );
}
