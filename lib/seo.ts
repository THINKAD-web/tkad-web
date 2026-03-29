import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { caseStudies } from "@/lib/case-studies";

export const OG_DIM = { width: 1200, height: 630 } as const;

/** Fallback OG when a segment has no dedicated opengraph-image route. */
export function defaultOgImages(
  locale: string,
  alt: { ko: string; en: string },
): NonNullable<NonNullable<Metadata["openGraph"]>["images"]> {
  return [
    {
      url: `/${locale}/opengraph-image`,
      ...OG_DIM,
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  "https://tkad.co.kr"
).replace(/\/$/, "");

/** Public path segments (no leading locale). Home is "". */
export const publicSeoPaths = [
  "",
  "/about",
  "/services",
  "/media",
  "/recommend",
  "/cases",
  "/insights",
  "/academy",
  "/contact",
  "/tools",
  "/faq",
  "/history",
  "/resources",
  "/compare",
  "/quote",
  "/portfolio",
  "/client",
  "/partner",
  "/blog",
  "/news",
  "/planner",
] as const;

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${p}`;
}

/** Indexed marketing URLs only (excludes login-style /client). */
export const sitemapPaths = publicSeoPaths.filter(
  (p) => p !== "/client" && p !== "/partner",
);

export function allPublicSitemapPaths(): { locale: string; path: string }[] {
  const out: { locale: string; path: string }[] = [];
  for (const locale of routing.locales) {
    for (const path of sitemapPaths) {
      out.push({ locale, path });
    }
    for (const cs of caseStudies) {
      out.push({ locale, path: `/cases/${cs.slug}` });
    }
  }
  return out;
}

/** hreflang-style alternates + canonical (relative to metadataBase). */
export function pageAlternates(
  locale: string,
  path: string,
): NonNullable<Metadata["alternates"]> {
  const p = path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  const origin = siteUrl.replace(/\/$/, "");
  return {
    canonical: `/${locale}${p}`,
    languages: {
      ko: `${origin}/ko${p}`,
      en: `${origin}/en${p}`,
      "x-default": `${origin}/ko${p}`,
    },
  };
}

/** Route-specific OG image at `/[locale]/[segment]/opengraph-image` (1200×630). */
export function segmentOpenGraphImages(
  locale: string,
  segment: string,
  alt: { ko: string; en: string },
): NonNullable<NonNullable<Metadata["openGraph"]>["images"]> {
  return [
    {
      url: `/${locale}/${segment}/opengraph-image`,
      ...OG_DIM,
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}

/** Dynamic case study OG at `/[locale]/cases/[slug]/opengraph-image` (1200×630). */
export function caseStudyOpenGraphImages(
  locale: string,
  slug: string,
  alt: { ko: string; en: string },
): NonNullable<NonNullable<Metadata["openGraph"]>["images"]> {
  return [
    {
      url: `/${locale}/cases/${slug}/opengraph-image`,
      ...OG_DIM,
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}
