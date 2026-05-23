import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getPublishedEducationBySlug } from "@/lib/public-auto-content";
import { InsightMarkdownBody } from "@/components/insights/markdown-body";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { pageAlternates, siteUrl } from "@/lib/seo";
import { ArrowLeft, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const article = await getPublishedEducationBySlug(slug);
  if (!article) {
    return { title: locale === "ko" ? "콘텐츠 없음" : "Not found" };
  }
  const title = article.titleKo;
  const description =
    article.metaDescription ?? article.excerptKo.slice(0, 160);
  return {
    title: `${title} | THINKAD Academy`,
    description,
    keywords: article.tags,
    alternates: pageAlternates(locale, `/academy/learn/${slug}`),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
    },
  };
}

export default async function EducationArticlePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const article = await getPublishedEducationBySlug(slug);
  if (!article) notFound();

  const url = `${siteUrl}/${locale}/academy/learn/${slug}`;

  return (
    <HomeLandingDayNight>
      <article className="mx-auto max-w-3xl px-4 py-12 text-foreground">
        <Link
          href="/academy"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Academy
        </Link>
        <div className="mb-2 flex items-center gap-2 text-primary">
          <GraduationCap className="h-5 w-5" />
          <span className="font-display text-xs uppercase tracking-widest">
            OOH 입문 가이드
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{article.titleKo}</h1>
        {article.excerptKo ? (
          <p className="mt-4 text-lg text-muted-foreground">{article.excerptKo}</p>
        ) : null}
        {article.publishedAt ? (
          <time
            dateTime={article.publishedAt.toISOString()}
            className="mt-4 block text-sm text-muted-foreground"
          >
            {article.publishedAt.toLocaleDateString("ko-KR")}
          </time>
        ) : null}
        <div className="mt-8">
          <InsightMarkdownBody markdown={article.contentKo} />
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: article.titleKo,
              description: article.metaDescription ?? article.excerptKo,
              url,
              datePublished: article.publishedAt?.toISOString(),
              dateModified: article.updatedAt.toISOString(),
              keywords: article.tags.join(", "),
            }),
          }}
        />
      </article>
    </HomeLandingDayNight>
  );
}
