import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { routing } from "@/i18n/routing";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import {
  BLOG_SEO_POSTS,
  getBlogSeoPost,
  type BlogSection,
} from "@/lib/blog-seo-posts";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { pageAlternates, serializeJsonLd } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import {
  buildBlogSeoLinks,
  SeoContextualLinks,
} from "@/components/seo/seo-contextual-links";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    BLOG_SEO_POSTS.map((p) => ({ locale, slug: p.slug })),
  );
}

function renderSection(section: BlogSection, isKo: boolean, key: number) {
  switch (section.type) {
    case "h2":
      return (
        <h2 key={key} className="mt-10 text-xl font-bold text-foreground">
          {isKo ? section.textKo : section.textEn}
        </h2>
      );
    case "p":
      return (
        <p key={key} className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {isKo ? section.textKo : section.textEn}
        </p>
      );
    case "ul": {
      const items = isKo ? section.itemsKo : section.itemsEn;
      return (
        <ul key={key} className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground sm:text-base">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }
    default:
      return null;
  }
}

function buildFaqJsonLd(
  post: NonNullable<ReturnType<typeof getBlogSeoPost>>,
  locale: string,
) {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const faqs = isKo ? post.faqsKo : post.faqsEn;
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: isKo ? "ko-KR" : "en-US",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const post = getBlogSeoPost(slug);
  if (!post) return { title: "Blog" };

  const isKo = locale === "ko" || locale.startsWith("ko");
  const title = isKo ? post.titleKo : post.titleEn;
  const description = isKo ? post.descriptionKo : post.descriptionEn;

  return {
    title: `${title} | THINKAD`,
    description,
    keywords: isKo ? post.keywordsKo : post.keywordsEn,
    alternates: pageAlternates(locale, `/blog/${slug}`),
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BlogSeoPostPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const post = getBlogSeoPost(slug);
  if (!post) notFound();

  const isKo = locale === "ko" || locale.startsWith("ko");
  const title = isKo ? post.titleKo : post.titleEn;
  const description = isKo ? post.descriptionKo : post.descriptionEn;
  const faqs = isKo ? post.faqsKo : post.faqsEn;

  let relatedMedia: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  if (post.relatedMediaIds?.length) {
    try {
      const catalog = await fetchPublicMediaCatalog();
      const idSet = new Set(post.relatedMediaIds);
      relatedMedia = catalog.filter((m) => idSet.has(m.id));
    } catch {
      /* skip */
    }
  }

  const breadcrumbLd = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "블로그" : "Blog", path: "/blog" },
    { name: title, path: `/blog/${slug}` },
  ]);
  const faqLd = buildFaqJsonLd(post, locale);
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: isKo ? "ko-KR" : "en-US",
  };
  const jsonLd = faqLd
    ? [breadcrumbLd, articleLd, faqLd]
    : [breadcrumbLd, articleLd];

  const contextualPills = buildBlogSeoLinks(post, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <HomeLandingDayNight>
        <article className="min-h-screen bg-gray-50 py-12 dark:bg-[#020202] sm:py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isKo ? "블로그 목록" : "Back to blog"}
            </Link>

            <header className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
                {post.publishedAt}
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-white/70 sm:text-base">
                {description}
              </p>
            </header>

            <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
              {post.sections.map((s, i) => renderSection(s, isKo, i))}

              {faqs.length > 0 ? (
                <section className="mt-10 border-t border-gray-100 pt-8 dark:border-white/10">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">FAQ</h2>
                  <dl className="mt-4 space-y-4">
                    {faqs.map((f) => (
                      <div key={f.q}>
                        <dt className="font-semibold text-gray-900 dark:text-white">{f.q}</dt>
                        <dd className="mt-1 text-sm text-gray-600 dark:text-white/70">{f.a}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
            </div>

            {relatedMedia.length > 0 ? (
              <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {isKo ? "관련 매체" : "Related media"}
                </h2>
                <ul className="mt-4 space-y-2">
                  {relatedMedia.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/media/${m.id}`}
                        className="text-sm font-semibold text-violet-500 hover:underline"
                      >
                        {isKo ? m.name : m.nameEn || m.name}
                      </Link>
                      <span className="ml-2 text-xs text-gray-500 dark:text-white/50">
                        {isKo ? m.location : m.locationEn || m.location}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-8">
              <SeoContextualLinks
                title={isKo ? "관련 랜딩" : "Related pages"}
                pills={contextualPills}
              />
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/planner"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-8 text-sm font-bold dark:text-white text-gray-900"
              >
                {isKo ? "AI 매체 플래너 시작" : "Start AI media planner"}
              </Link>
            </div>
          </div>
        </article>
      </HomeLandingDayNight>
    </>
  );
}
