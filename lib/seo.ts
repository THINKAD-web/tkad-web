import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";

export const OG_DIM = { width: 1200, height: 630 } as const;

export type OgImageDescriptor = {
  url: string;
  width: number;
  height: number;
  alt: string;
  type?: string;
};

export type OgImageList = OgImageDescriptor[];

/** 카카오·iMessage 등 크롤러용 기본 JPG (public/og-default 대체) */
export const DEFAULT_OG_CDN_IMAGE =
  "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/0d44e972-2876-4145-b552-6c8641c53867.jpg";

/** 앱 프로덕션 origin 폴백 */
export const OG_PRODUCTION_ORIGIN = "https://tkad.co.kr";

/**
 * 절대 URL(OG, sitemap, JSON-LD, canonical, 이메일 링크)의 기준.
 * - `NEXT_PUBLIC_SITE_URL` / `SITE_URL` 우선 (운영·프리뷰·로컬 공통)
 * - 미설정 + Vercel 프리뷰: tkad-web.vercel.app
 * - 폴백: tkad.co.kr
 */
function resolvePublicSiteUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "preview") {
    return "https://tkad-web.vercel.app";
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return OG_PRODUCTION_ORIGIN;
}

export const siteUrl = resolvePublicSiteUrl();

/** Kakao/messenger crawlers — OG 이미지는 반드시 앱 origin(siteUrl) 절대 URL */
export function ogImageUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl.replace(/\/$/, "")}${p}`;
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
): OgImageList {
  return [
    {
      url: ogImageUrl(`/${locale}/opengraph-image`),
      ...OG_DIM,
      type: "image/png",
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}

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
 * `canonical` 은 metadataBase(siteUrl) 기준 상대 경로 → 운영 시 https://app.tkad.co.kr/ko/… 절대 URL.
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
): OgImageList {
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
): OgImageList {
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
): OgImageList {
  return [
    {
      url: ogImageUrl(`/${locale}/media/${id}/opengraph-image`),
      ...OG_DIM,
      type: "image/png",
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}

export function packageOpenGraphImages(
  locale: string,
  slug: string,
  alt: { ko: string; en: string },
): OgImageList {
  return [
    {
      url: ogImageUrl(`/${locale}/media/packages/${slug}/opengraph-image`),
      ...OG_DIM,
      type: "image/png",
      alt: locale === "ko" ? alt.ko : alt.en,
    },
  ];
}

export type ShareImageSource =
  | { kind: "cdn" }
  | { kind: "url"; url: string }
  | { kind: "segment"; segment: string }
  | { kind: "media"; locale: string; mediaId: string }
  | { kind: "package"; locale: string; slug: string }
  | { kind: "default" };

function ogImageEntry(
  url: string,
  alt: { ko: string; en: string },
  locale: string,
  type?: string,
): OgImageDescriptor {
  const isJpeg =
    /\.(jpe?g)(\?|$)/i.test(url) || url.includes("b-cdn.net");
  return {
    url,
    ...OG_DIM,
    ...(type ? { type } : isJpeg ? { type: "image/jpeg" } : { type: "image/png" }),
    alt: locale === "ko" || locale.startsWith("ko") ? alt.ko : alt.en,
  };
}

export function resolveShareImages(
  locale: string,
  alt: { ko: string; en: string },
  source?: ShareImageSource,
): OgImageList {
  if (!source || source.kind === "default") {
    return defaultOgImages(locale, alt);
  }
  if (source.kind === "cdn") {
    return [ogImageEntry(DEFAULT_OG_CDN_IMAGE, alt, locale, "image/jpeg")];
  }
  if (source.kind === "url") {
    const url = source.url.trim();
    if (/^https?:\/\//i.test(url)) {
      return [ogImageEntry(url, alt, locale)];
    }
  }
  if (source.kind === "segment") {
    return segmentOpenGraphImages(locale, source.segment, alt);
  }
  if (source.kind === "media") {
    return mediaOpenGraphImages(locale, source.mediaId, alt);
  }
  if (source.kind === "package") {
    return packageOpenGraphImages(locale, source.slug, alt);
  }
  return defaultOgImages(locale, alt);
}

/**
 * 매체 상세: 실제 썸네일(카카오 호환) 우선, 없으면 동적 opengraph-image.
 */
export function mediaDetailShareImages(
  locale: string,
  mediaId: string,
  primaryImageUrl: string | null | undefined,
  alt: { ko: string; en: string },
): OgImageList {
  const thumb = primaryImageUrl?.trim();
  if (thumb && /^https?:\/\//i.test(thumb)) {
    return [ogImageEntry(thumb, alt, locale)];
  }
  return mediaOpenGraphImages(locale, mediaId, alt);
}

export function siteNameForLocale(locale: string): string {
  return locale === "ko" || locale.startsWith("ko")
    ? "THINKAD 싱커드"
    : "THINKAD";
}

/** 하위 페이지 title 템플릿 — 키워드 선행, 브랜드는 뒤로 약하게 */
export function siteTitleTemplate(locale: string): string {
  return "%s | THINKAD";
}

/** openGraph + twitter (summary_large_image) — 모든 공개 페이지에서 images 보장 */
export function buildShareMetadata(opts: {
  locale: string;
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  alt?: { ko: string; en: string };
  image?: ShareImageSource;
  /** 계산된 images가 있으면 image 소스보다 우선 */
  images?: OgImageList;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const isKo = opts.locale === "ko" || opts.locale.startsWith("ko");
  const alt = opts.alt ?? { ko: opts.title, en: opts.title };
  const images =
    opts.images ?? resolveShareImages(opts.locale, alt, opts.image);
  const path = opts.path
    ? opts.path.startsWith("/")
      ? opts.path
      : `/${opts.path}`
    : undefined;

  return {
    openGraph: {
      type: opts.type ?? "website",
      locale: isKo ? "ko_KR" : "en_US",
      siteName: siteNameForLocale(opts.locale),
      ...(path ? { url: `/${opts.locale}${path}` } : {}),
      title: opts.title,
      description: opts.description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images,
    },
  };
}
