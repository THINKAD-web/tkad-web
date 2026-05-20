import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MapPin } from "lucide-react";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";
import {
  filterCasesForLocalLanding,
  getLocalSeoLanding,
  LOCAL_SEO_LANDINGS,
  localLandingDescription,
  localLandingTitle,
  localSeoPath,
  matchesLocalSeoLanding,
  type LocalSeoLanding,
} from "@/lib/local-seo-landings";
import { pageAlternates, serializeJsonLd } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildMediaCatalogItemListJsonLd,
} from "@/lib/structured-data";
import { MediaKeywordLandingCatalog } from "@/components/media-keyword-landing-catalog";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { MediaKeywordLandingHero } from "@/components/media-keyword-landing-hero";
import { MediaKeywordLandingEmpty } from "@/components/media-keyword-landing-empty";

type Props = {
  params: Promise<{ locale: string; region: string; district: string }>;
};

export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    LOCAL_SEO_LANDINGS.map((l) => ({
      locale,
      region: l.region,
      district: l.district,
    })),
  );
}

function buildFaqJsonLd(
  landing: LocalSeoLanding,
  locale: string,
) {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const faqs = isKo ? landing.faqsKo : landing.faqsEn;
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
  const { locale: rawLocale, region, district } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const landing = getLocalSeoLanding(region, district);
  if (!landing) return { title: "Local OOH" };

  let count = 0;
  try {
    const catalog = await fetchPublicMediaCatalog();
    count = catalog.filter((m) => matchesLocalSeoLanding(m, landing)).length;
  } catch {
    /* metadata only */
  }

  const title = localLandingTitle(landing, locale, count);
  const description = localLandingDescription(landing, locale, count);
  const path = localSeoPath(landing);

  return {
    title,
    description,
    keywords: locale === "ko"
      ? [
          `${landing.placeKo} 옥외광고`,
          `${landing.placeKo} 전광판`,
          `${landing.placeKo} 광고비`,
          "OOH 견적",
          "THINKAD",
        ]
      : [
          `${landing.placeEn} OOH`,
          `${landing.placeEn} billboard`,
          "THINKAD",
        ],
    alternates: pageAlternates(locale, path),
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LocalSeoLandingPage({ params }: Props) {
  const { locale: rawLocale, region, district } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);

  const landing = getLocalSeoLanding(region, district);
  if (!landing) notFound();

  const isKo = locale === "ko" || locale.startsWith("ko");
  const path = localSeoPath(landing);

  let catalog: Awaited<ReturnType<typeof fetchPublicMediaCatalog>> = [];
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch {
    /* empty catalog */
  }

  const filtered = catalog.filter((m) => matchesLocalSeoLanding(m, landing));
  const title = isKo ? landing.headlineKo : landing.headlineEn;
  const description = isKo ? landing.introKo : landing.introEn;
  const traits = isKo ? landing.traitsKo : landing.traitsEn;
  const faqs = isKo ? landing.faqsKo : landing.faqsEn;

  const cases = await getPublishedSuccessCases(locale);
  const localCases = filterCasesForLocalLanding(cases, landing, 3);

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
    { name: isKo ? landing.placeKo : landing.placeEn, path },
  ]);
  const faqLd = buildFaqJsonLd(landing, locale);
  const jsonLd = faqLd ? [itemListLd, breadcrumbLd, faqLd] : [itemListLd, breadcrumbLd];

  const relatedLinks = LOCAL_SEO_LANDINGS.filter(
    (l) => l.region === landing.region && l.district !== landing.district,
  )
    .slice(0, 6)
    .map((l) => ({
      href: localSeoPath(l),
      label: isKo ? l.placeKo : l.placeEn,
    }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon tkad-media-page">
          <MediaKeywordLandingHero
            eyebrow={`// ${isKo ? "지역별 옥외광고" : "LOCAL OOH"}`}
            title={title}
            description={description}
            icon={<MapPin className="size-7 text-white/90" aria-hidden />}
            primaryCta={{
              href: "/media",
              label: isKo ? "전체 매체 보기" : "All media",
            }}
            secondaryCta={{
              href: "/planner",
              label: isKo ? "AI 매체 추천" : "AI planner",
            }}
          />

          <div className="mx-auto max-w-6xl space-y-10 px-4 pt-8 sm:px-6">
            {traits.length > 0 ? (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <h2 className="text-lg font-bold text-white">
                  {isKo ? "지역 특성" : "Area highlights"}
                </h2>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-white/80">
                  {traits.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {filtered.length === 0 ? (
              <MediaKeywordLandingEmpty
                message={
                  isKo
                    ? `현재 ${landing.placeKo}에 등록된 매체가 없습니다.`
                    : `No media registered for ${landing.placeEn} yet.`
                }
                ctaLabel={isKo ? "전체 매체 보기" : "Browse all media"}
              />
            ) : (
              <section>
                <h2 className="mb-4 text-lg font-bold text-white">
                  {isKo
                    ? `${landing.placeKo} 매체 ${filtered.length}개`
                    : `${filtered.length} placements in ${landing.placeEn}`}
                </h2>
                <MediaKeywordLandingCatalog items={filtered} locale={locale} />
                <p className="mt-4 text-center">
                  <Link
                    href="/media"
                    className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 hover:underline"
                  >
                    {isKo ? "전체 매체·지도에서 보기 →" : "Browse all media & map →"}
                  </Link>
                </p>
              </section>
            )}

            {localCases.length > 0 ? (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-bold text-white">
                  {isKo ? "이 지역 집행 성공 사례" : "Cases in this area"}
                </h2>
                <ul className="mt-4 space-y-3">
                  {localCases.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/cases/${c.id}`}
                        className="block rounded-xl border border-white/10 bg-black/20 p-4 transition-colors hover:border-white/25"
                      >
                        <p className="font-semibold text-white">
                          {isKo ? c.titleKo : c.titleEn || c.titleKo}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-white/70">
                          {isKo ? c.summaryKo : c.summaryEn || c.summaryKo}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {faqs.length > 0 ? (
              <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-bold text-white">FAQ</h2>
                <dl className="mt-4 space-y-4">
                  {faqs.map((f) => (
                    <div key={f.q}>
                      <dt className="font-semibold text-white">{f.q}</dt>
                      <dd className="mt-1 text-sm text-white/75">{f.a}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {relatedLinks.length > 0 ? (
              <section className="tkad-media-links-footer border-t border-border/80 py-12">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {isKo ? "인근·관련 지역" : "Nearby areas"}
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {relatedLinks.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="inline-flex rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground hover:border-accent"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </HomeLandingDayNight>
    </>
  );
}
