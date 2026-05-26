import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  PackageBottomCta,
  PackageDynamicMediaSection,
} from "@/components/packages/package-dynamic-media";
import {
  PackageBudgetSection,
  PackageFaqSection,
  PackageGuideSection,
  PackageIndustrySection,
  PackageLandingHero,
} from "@/components/packages/package-landing-sections";
import {
  fetchMediaPackageBySlug,
  fetchMediaPackageSlugs,
} from "@/lib/media-package-db";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { pageAlternates } from "@/lib/seo";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const dynamicParams = true;

export async function generateStaticParams() {
  if (process.env.VERCEL === "1") return [];
  const slugs = await fetchMediaPackageSlugs();
  return slugs.flatMap((slug) => [
    { locale: "ko", slug },
    { locale: "en", slug },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  const pkg = await fetchMediaPackageBySlug(slug);
  if (!pkg) return { title: "Not found" };
  const isKo = locale.startsWith("ko");
  const title = isKo
    ? `${pkg.name} | OOH 패키지 | THINKAD`
    : `${pkg.name} | OOH Package | THINKAD`;
  const description = pkg.description;
  return {
    title,
    description,
    alternates: pageAlternates(locale, `/media/packages/${slug}`),
  };
}

export default async function MediaPackageLandingPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = await resolveLocaleParam(Promise.resolve({ locale: rawLocale }));
  setRequestLocale(locale);
  const isKo = locale.startsWith("ko");
  const pkg = await fetchMediaPackageBySlug(slug);
  if (!pkg) notFound();

  const breadcrumbLd = buildBreadcrumbJsonLd(locale, [
    { name: isKo ? "홈" : "Home", path: "" },
    { name: isKo ? "패키지" : "Packages", path: "/media/packages" },
    { name: pkg.name, path: `/media/packages/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-media-page">
          <PackageLandingHero pkg={pkg} isKo={isKo} />

          <PackageDynamicMediaSection
            slug={pkg.slug}
            packageName={pkg.name}
            isKo={isKo}
          />

          <PackageGuideSection steps={pkg.guideSteps} isKo={isKo} />
          <PackageIndustrySection industries={pkg.targetIndustry} isKo={isKo} />
          <PackageBudgetSection avgBudget={pkg.avgBudget} isKo={isKo} />
          <PackageFaqSection items={pkg.faqs} isKo={isKo} />

          <PackageBottomCta
            slug={pkg.slug}
            packageName={pkg.name}
            isKo={isKo}
          />
        </div>
      </HomeLandingDayNight>
    </>
  );
}
