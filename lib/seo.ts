import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";

export const OG_DIM = { width: 1200, height: 630 } as const;

/** Kakao/messenger crawlers must fetch OG images from the production origin. */
export const OG_PRODUCTION_ORIGIN = "https://tkad.co.kr";

export function ogImageUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${OG_PRODUCTION_ORIGIN}${p}`;
}

const SITE_KEYWORDS = {
  ko: [
    "OOH 광고",
    "옥외광고",
    "DOOH",
    "디지털 옥외광고",
    "빌보드 광고",
    "디지털 사이니지",
    "전광판 광고",
    "교통 광고",
    "버스쉘터 광고",
    "지하철 광고",
    "광고 에이전시",
    "옥외광고 견적",
    "미디어 플래너",
    "싱커드",
    "THINKAD",
    "코엑스 전광판",
    "강남 광고",
  ],
  en: [
    "OOH advertising",
    "OOH media Korea",
    "DOOH",
    "digital out-of-home",
    "billboard advertising",
    "digital signage",
    "transit advertising",
    "subway advertising Korea",
    "bus shelter advertising",
    "OOH agency Korea",
    "outdoor advertising quote",
    "media planner",
    "THINKAD",
    "Korea advertising agency",
    "COEX billboard",
    "Gangnam advertising",
  ],
} as const;

/** Fallback OG when a segment has no dedicated opengraph-image route. */
export function defaultOgImages(
  locale: string,
  alt: { ko: string; en: string },
): NonNullable<NonNullable<Metadata["openGraph"]>["images"]> {
  return [
    {
      url: ogImageUrl(`/${locale}/opengraph-image`),
      ...OG_DIM,
      type: "image/png",
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}

/**
 * 절대 URL(OG, sitemap, JSON-LD, canonical)의 기준.
 * - 운영: Vercel에 `NEXT_PUBLIC_SITE_URL`(권장) 또는 `SITE_URL` = **실제 도메인** (예: https://example.com)
 * - 미설정 + Vercel 프리뷰: `VERCEL_URL` 기준 https://… (프리뷰용)
 * - 로컬/폴백: tkad.co.kr
 */
function resolvePublicSiteUrl(): string {
  if (process.env.VERCEL_ENV === "production") {
    return OG_PRODUCTION_ORIGIN;
  }
  if (process.env.VERCEL_ENV === "preview") {
    return "https://tkad-web.vercel.app";
  }
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return OG_PRODUCTION_ORIGIN;
}

export const siteUrl = resolvePublicSiteUrl();

export function siteKeywords(locale: string): string[] {
  return locale === "ko" ? [...SITE_KEYWORDS.ko] : [...SITE_KEYWORDS.en];
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Public path segments (no leading locale). Home is "". */
export const publicSeoPaths = [
  "",
  "/about",
  "/services",
  "/media",
  "/media/packages",
  "/packages",
  "/recommend",
  "/cases",
  "/insights",
  "/report",
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
  "/glossary",
  "/guides",
  "/budget-tool",
  "/pricing-guide",
] as const;

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${p}`;
}

/** Indexed marketing URLs only (excludes login-style /client). */
export const sitemapPaths = publicSeoPaths.filter(
  (p) => p !== "/client" && p !== "/partner",
);

export async function allPublicSitemapPaths(): Promise<
  { locale: string; path: string }[]
> {
  const cases = await getPublishedSuccessCases();
  const out: { locale: string; path: string }[] = [];
  for (const locale of routing.locales) {
    for (const path of sitemapPaths) {
      out.push({ locale, path });
    }
    for (const cs of cases) {
      out.push({ locale, path: `/cases/${cs.id}` });
    }
  }
  return out;
}

/**
 * hreflang alternates + canonical.
 * `canonical` 은 metadataBase(siteUrl) 기준 상대 경로 → 운영 시 https://tkad.co.kr/ko/… 절대 URL.
 * vercel.app 프리뷰는 NEXT_PUBLIC_SITE_URL 미설정 시 VERCEL_URL 기준이므로 프로덕션에 도메인 고정 권장.
 */
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
      url: ogImageUrl(`/${locale}/${segment}/opengraph-image`),
      ...OG_DIM,
      type: "image/png",
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
      url: ogImageUrl(`/${locale}/cases/${slug}/opengraph-image`),
      ...OG_DIM,
      type: "image/png",
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}

/** Dynamic media detail OG at `/[locale]/media/[id]/opengraph-image` (1200×630). */
export function mediaOpenGraphImages(
  locale: string,
  id: string,
  alt: { ko: string; en: string },
): NonNullable<NonNullable<Metadata["openGraph"]>["images"]> {
  return [
    {
      url: ogImageUrl(`/${locale}/media/${id}/opengraph-image`),
      ...OG_DIM,
      type: "image/png",
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}
