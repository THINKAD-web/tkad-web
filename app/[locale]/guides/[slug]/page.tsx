import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getGuideBySlug, GUIDES } from "@/lib/guides-data";
import { getPublishedGuideBySlug } from "@/lib/public-auto-content";
import { SEO_GUIDE_SLUGS, SEO_GUIDE_TOPICS } from "@/lib/seo-content/seo-guide-topics";
import { DbGuideArticlePage } from "@/components/guides/db-guide-article-page";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { pageAlternates, segmentOpenGraphImages, serializeJsonLd, siteUrl } from "@/lib/seo";
import { ogAltForRoute } from "@/lib/og-route-copy";
import { regionLabel, typeLabel } from "@/lib/media-keyword-landing";
import { ArrowRight, BookText, Calendar } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/** Build-time DB fetch omitted — Vercel 8GB builders OOM/timeout 방지; slugs are known constants. */
export function generateStaticParams() {
  const slugs = new Set([...GUIDES.map((g) => g.slug), ...SEO_GUIDE_SLUGS]);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const dbGuide = await getPublishedGuideBySlug(slug);
  if (dbGuide) {
    const seoTopic = SEO_GUIDE_TOPICS.find((t) => t.slug === slug);
    const title =
      seoTopic?.titleKo ?? dbGuide.titleKo;
    const description =
      dbGuide.metaDescription ??
      dbGuide.excerptKo?.slice(0, 160) ??
      "";
    return {
      title: `${title} | THINKAD 싱커드`,
      description,
      keywords: dbGuide.tags,
      alternates: pageAlternates(locale, `/guides/${slug}`),
      openGraph: {
        title,
        description,
        type: "article",
        publishedTime: dbGuide.publishedAt?.toISOString(),
        modifiedTime: dbGuide.updatedAt.toISOString(),
        images: segmentOpenGraphImages(
          locale,
          "guides",
          ogAltForRoute("guides"),
        ),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: segmentOpenGraphImages(
          locale,
          "guides",
          ogAltForRoute("guides"),
        ),
      },
    };
  }
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: locale === "ko" ? "가이드 없음" : "Guide not found" };
  const isKo = locale === "ko";
  const title = isKo ? guide.titleKo : guide.titleEn;
  const description = isKo ? guide.descriptionKo : guide.descriptionEn;
  return {
    title,
    description,
    keywords: isKo ? guide.keywordsKo : guide.keywordsEn,
    alternates: pageAlternates(locale, `/guides/${slug}`),
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt ?? guide.publishedAt,
      images: segmentOpenGraphImages(
        locale,
        "guides",
        ogAltForRoute("guides"),
      ),
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description,
      images: segmentOpenGraphImages(
          locale,
          "guides",
          ogAltForRoute("guides"),
      ),
    },
    robots: guide.draft
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/**
 * Article + FAQPage JSON-LD — 가이드 상세에서 함께 출력.
 * publishedAt / updatedAt 으로 검색엔진 freshness 시그널 제공.
 */
function buildGuideArticleJsonLd(guide: NonNullable<ReturnType<typeof getGuideBySlug>>, locale: string) {
  const isKo = locale === "ko";
  const url = `${siteUrl.replace(/\/$/, "")}/${locale}/guides/${guide.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: (isKo ? guide.titleKo : guide.titleEn).slice(0, 110),
    description: isKo ? guide.descriptionKo : guide.descriptionEn,
    url,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt ?? guide.publishedAt,
    inLanguage: locale === "ko" ? "ko-KR" : "en-US",
    author: { "@id": `${siteUrl}/#organization` },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: url,
    keywords: (isKo ? guide.keywordsKo : guide.keywordsEn).join(", "),
  };
}

function buildGuideFaqJsonLd(guide: NonNullable<ReturnType<typeof getGuideBySlug>>, locale: string) {
  if (!guide.faqs?.length) return null;
  const isKo = locale === "ko";
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale === "ko" ? "ko-KR" : "en-US",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: isKo ? f.questionKo : f.questionEn,
      acceptedAnswer: {
        "@type": "Answer",
        text: isKo ? f.answerKo : f.answerEn,
      },
    })),
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const dbGuide = await getPublishedGuideBySlug(slug);
  if (dbGuide) {
    return <DbGuideArticlePage article={dbGuide} locale={locale} />;
  }

  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const isKo = locale === "ko";
  const breadcrumb = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "가이드" : "Guides", path: "/guides" },
    {
      name: (isKo ? guide.titleKo : guide.titleEn).slice(0, 60),
      path: `/guides/${guide.slug}`,
    },
  ]);
  const article = buildGuideArticleJsonLd(guide, locale);
  const faqLd = buildGuideFaqJsonLd(guide, locale);
  const ld = [article, breadcrumb, ...(faqLd ? [faqLd] : [])];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }}
      />

      <article className="bg-card">
        {/* Hero */}
        <header className="border-b-2 border-border bg-hero-void py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
              <BookText className="mr-2 inline h-3.5 w-3.5" aria-hidden />
              [ {isKo ? "가이드" : "GUIDE"} ]
            </p>
            {guide.draft ? (
              <p className="mt-4 inline-flex items-center border-2 border-accent bg-accent px-3 py-1 font-display text-xs font-medium uppercase tracking-[0.22em] text-accent-foreground">
                {`// `}
                {isKo
                  ? "초안 — 편집자 검수 진행 중"
                  : "DRAFT — under editor review"}
              </p>
            ) : null}
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-hero-fg sm:text-4xl lg:text-5xl">
              {isKo ? guide.titleKo : guide.titleEn}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-hero-fg/80 sm:text-lg">
              {isKo ? guide.descriptionKo : guide.descriptionEn}
            </p>
            <p className="mt-6 flex items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-hero-fg/55">
              <Calendar className="h-3 w-3" aria-hidden />
              {`// `}
              {new Date(guide.publishedAt).toLocaleDateString(
                isKo ? "ko-KR" : "en-US",
              )}
              {guide.updatedAt && guide.updatedAt !== guide.publishedAt
                ? ` · ${isKo ? "갱신" : "Updated"} ${new Date(guide.updatedAt).toLocaleDateString(isKo ? "ko-KR" : "en-US")}`
                : null}
            </p>
          </div>
        </header>

        {/* 본문 */}
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {guide.sections.map((sec, i) => (
            <section key={i} className="mt-10 first:mt-0">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {isKo ? sec.headingKo : sec.headingEn}
              </h2>
              <div className="mt-5 space-y-4">
                {(isKo ? sec.paragraphsKo : sec.paragraphsEn).map((p, idx) => (
                  <p key={idx} className="text-base leading-relaxed text-foreground">
                    {p}
                  </p>
                ))}
              </div>
              {(isKo ? sec.bulletsKo : sec.bulletsEn)?.length ? (
                <ul className="mt-5 space-y-2">
                  {(isKo ? sec.bulletsKo : sec.bulletsEn)?.map((b, idx) => (
                    <li
                      key={idx}
                      className="flex gap-3 border-l-2 border-accent pl-4 text-base leading-relaxed text-foreground"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          {/* FAQ */}
          {guide.faqs && guide.faqs.length > 0 ? (
            <section className="mt-16 border-t-2 border-border pt-10">
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                [ FAQ ]
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {isKo ? "자주 묻는 질문" : "Frequently Asked Questions"}
              </h2>
              <dl className="mt-6 space-y-0">
                {guide.faqs.map((f, idx) => (
                  <div
                    key={idx}
                    className="-mt-[2px] border-2 border-border bg-card p-5"
                  >
                    <dt className="text-base font-bold text-foreground">
                      Q. {isKo ? f.questionKo : f.questionEn}
                    </dt>
                    <dd className="mt-3 text-base leading-relaxed text-foreground">
                      {isKo ? f.answerKo : f.answerEn}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* 관련 키워드 랜딩으로 내부 링크 */}
          <section className="mt-16 border-t-2 border-border pt-10">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
              [ {isKo ? "관련 매체 둘러보기" : "BROWSE RELATED MEDIA"} ]
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {guide.relatedRegion ? (
                <li>
                  <Link
                    href={`/media/region/${guide.relatedRegion}`}
                    className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                  >
                    {regionLabel(guide.relatedRegion, locale)}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ) : null}
              {guide.relatedTypes?.map((t) => (
                <li key={t}>
                  <Link
                    href={`/media/type/${t}`}
                    className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                  >
                    {typeLabel(t, locale)}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
              {guide.relatedAreas?.map((a) => (
                <li key={a}>
                  <Link
                    href={`/media/area/${encodeURIComponent(a)}`}
                    className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-4 py-2 font-display text-[11px] font-bold tracking-[0.04em] text-foreground transition-colors hover:bg-foreground hover:text-background"
                  >
                    {a}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </>
  );
}
