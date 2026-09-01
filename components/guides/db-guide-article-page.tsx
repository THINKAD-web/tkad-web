import { Link } from "@/i18n/navigation";
import type { PublicGuideArticle } from "@/lib/public-auto-content";
import { InsightMarkdownBody } from "@/components/insights/markdown-body";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { serializeJsonLd } from "@/lib/seo";
import { BookText, Calendar } from "lucide-react";

export function DbGuideArticlePage({
  article,
  locale,
}: {
  article: PublicGuideArticle;
  locale: string;
}) {
  const isKo = locale === "ko";
  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "가이드" : "Guides", path: "/guides" },
    { name: article.titleKo.slice(0, 60), path: `/guides/${article.slug}` },
  ]);
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.titleKo,
    description: article.metaDescription ?? article.excerptKo,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    keywords: article.tags.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd([articleLd, breadcrumb]),
        }}
      />
      <article className="bg-card">
        <header className="border-b-2 border-border bg-hero-void py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="tkad-type-label text-accent">
              <BookText className="mr-2 inline h-3.5 w-3.5" aria-hidden />
              [ {isKo ? "OOH 가이드" : "OOH GUIDE"} ]
            </p>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl lg:text-5xl">
              {article.titleKo}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-hero-fg/80 sm:text-lg">
              {article.excerptKo}
            </p>
            {article.publishedAt ? (
              <p className="mt-6 flex items-center gap-2 tkad-type-label text-hero-fg/55">
                <Calendar className="h-3 w-3" aria-hidden />
                {article.publishedAt.toLocaleDateString(isKo ? "ko-KR" : "en-US")}
              </p>
            ) : null}
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <InsightMarkdownBody markdown={article.contentKo} />
          <section className="mt-16 border-t-2 border-border pt-10">
            <Link
              href="/planner"
              className="inline-flex border-2 border-border bg-foreground px-4 py-2 tkad-type-labelst text-background"
            >
              AI 플래너로 매체 추천받기
            </Link>
          </section>
        </div>
      </article>
    </>
  );
}
