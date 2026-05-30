import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Monitor } from "lucide-react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  isMarketingMediaTypeSlug,
  MARKETING_MEDIA_TYPE_SLUGS,
  marketingTypeDef,
  marketingTypeLandingDescription,
  marketingTypeLandingTitle,
  matchesMarketingMediaType,
  type MarketingMediaTypeSlug,
} from "@/lib/marketing-media-types";
import { buildShareMetadata, pageAlternates, serializeJsonLd } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { MediaKeywordLandingCatalog } from "@/components/media-keyword-landing-catalog";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { MediaKeywordLandingEmpty } from "@/components/media-keyword-landing-empty";
import { deferCatalogLandingStaticGeneration } from "@/lib/vercel-static-build";

type Props = {
  params: Promise<{ locale: string; mediaType: string }>;
};

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  if (deferCatalogLandingStaticGeneration()) return [];
  return routing.locales.flatMap((locale) =>
    MARKETING_MEDIA_TYPE_SLUGS.map((mediaType) => ({ locale, mediaType })),
  );
}

function buildFaqJsonLd(slug: MarketingMediaTypeSlug, locale: string) {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const def = marketingTypeDef(slug);
  const faqs = isKo ? def.faqsKo : def.faqsEn;
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
  const { locale: rawLocale, mediaType } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  if (!isMarketingMediaTypeSlug(mediaType)) return { title: "OOH type" };

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalog();
    count = catalog.filter((m) => matchesMarketingMediaType(m, mediaType)).length;
  } catch {
    /* metadata only */
  }

  const title = marketingTypeLandingTitle(mediaType, locale, count);
  const description = marketingTypeLandingDescription(mediaType, locale, count);

  return {
    title,
    description,
    alternates: pageAlternates(locale, `/type/${mediaType}`),
    ...buildShareMetadata({
      locale,
      title,
      description,
      path: `/type/${mediaType}`,
      image: { kind: "segment", segment: "media" },
    }),
  };
}

export default async function MarketingTypeLandingPage({ params }: Props) {
  const { locale: rawLocale, mediaType } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  if (!isMarketingMediaTypeSlug(mediaType)) notFound();

  const isKo = locale === "ko" || locale.startsWith("ko");
  const def = marketingTypeDef(mediaType);

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    /* empty */
  }

  const filtered = catalog.filter((m) => matchesMarketingMediaType(m, mediaType));
  const title = isKo ? def.labelKo : def.labelEn;
  const intro = isKo ? def.introKo : def.introEn;
  const pros = isKo ? def.prosKo : def.prosEn;
  const cons = isKo ? def.consKo : def.consEn;
  const industries = isKo ? def.industriesKo : def.industriesEn;
  const budget = isKo ? def.budgetKo : def.budgetEn;
  const faqs = isKo ? def.faqsKo : def.faqsEn;

  const itemListLd = buildMediaCatalogItemListJsonLd(
    locale,
    filtered.map((m) => ({
      id: m.id,
      name: m.name,
      nameEn: m.nameEn,
      location: m.location,
      locationEn: m.locationEn,
    })),
    50,
  );
  const breadcrumbLd = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "옥외광고 매체" : "OOH media", path: "/media" },
    { name: title, path: `/type/${mediaType}` },
  ]);
  const faqLd = buildFaqJsonLd(mediaType, locale);
  const jsonLd = faqLd ? [itemListLd, breadcrumbLd, faqLd] : [itemListLd, breadcrumbLd];

  const otherTypes = MARKETING_MEDIA_TYPE_SLUGS.filter((t) => t !== mediaType);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
          <MediaKeywordLandingHero
            eyebrow={`// ${isKo ? "매체 유형" : "MEDIA TYPE"}`}
            title={title}
            description={intro}
            icon={<Monitor className="size-7 dark:text-white text-gray-800" aria-hidden />}
            primaryCta={{
              href: "/media",
              label: isKo ? "전체 매체 보기" : "All media",
            }}
            secondaryCta={{
              href: "/compare",
              label: isKo ? "매체 비교" : "Compare",
            }}
          />

          <div className="mx-auto max-w-6xl space-y-10 px-4 pt-8 sm:px-6">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6 backdrop-blur">
                <h2 className="text-lg font-bold dark:text-white text-gray-900">
                  {isKo ? "장점" : "Strengths"}
                </h2>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm dark:text-white text-gray-700">
                  {pros.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6 backdrop-blur">
                <h2 className="text-lg font-bold dark:text-white text-gray-900">
                  {isKo ? "고려 사항" : "Considerations"}
                </h2>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm dark:text-white text-gray-700">
                  {cons.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6 backdrop-blur">
              <h2 className="text-lg font-bold dark:text-white text-gray-900">
                {isKo ? "적합 업종 · 예산 가이드" : "Industries & budget"}
              </h2>
              <p className="mt-2 text-sm dark:text-white text-gray-700">
                {isKo ? "추천 업종: " : "Best for: "}
                {industries.join(isKo ? ", " : ", ")}
              </p>
              <p className="mt-2 text-sm font-semibold text-cyan-200/90">{budget}</p>
            </section>

            {filtered.length === 0 ? (
              <MediaKeywordLandingEmpty
                message={
                  isKo
                    ? "현재 이 유형에 등록된 매체가 없습니다."
                    : "No media in this category yet."
                }
                ctaLabel={isKo ? "전체 매체 보기" : "Browse all media"}
              />
            ) : (
              <section>
                <h2 className="mb-4 text-lg font-bold dark:text-white text-gray-900">
                  {isKo
                    ? `${title} 매체 ${filtered.length}개`
                    : `${filtered.length} ${title} placements`}
                </h2>
                <MediaKeywordLandingCatalog items={filtered} locale={locale} />
              </section>
            )}

            {faqs.length > 0 ? (
              <section className="rounded-2xl border dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 p-6">
                <h2 className="text-lg font-bold dark:text-white text-gray-900">FAQ</h2>
                <dl className="mt-4 space-y-4">
                  {faqs.map((f) => (
                    <div key={f.q}>
                      <dt className="font-semibold dark:text-white text-gray-900">{f.q}</dt>
                      <dd className="mt-1 text-sm dark:text-white text-gray-700">{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <section className="tkad-media-links-footer border-t border-border/80 py-12">
              <p className="font-display text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {isKo ? "다른 유형" : "Other formats"}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {otherTypes.map((t) => {
                  const d = marketingTypeDef(t);
                  return (
                    <li key={t}>
                      <Link
                        href={`/type/${t}`}
                        className="inline-flex rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground hover:border-accent"
                      >
                        {isKo ? d.labelKo : d.labelEn}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      </HomeLandingDayNight>
    </>
  );
}
