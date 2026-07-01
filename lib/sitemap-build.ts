import type { MetadataRoute } from "next";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { INDUSTRY_SLUGS } from "@/lib/industry-landing";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { siteUrl, sitemapPaths } from "@/lib/seo";
import { listGuideMeta } from "@/lib/guides-data";
import { BLOG_SEO_POSTS } from "@/lib/blog-seo-posts";
import { LOCAL_SEO_LANDINGS, localSeoPath } from "@/lib/local-seo-landings";
import { MARKETING_MEDIA_TYPE_SLUGS } from "@/lib/marketing-media-types";
import {
  KNOWN_MEDIA_CATEGORY_SLUGS,
  KNOWN_TARGET_SLUGS,
} from "@/lib/media-category-landing";
import { KNOWN_SPECIAL_SLUGS } from "@/lib/special-media-landings";
import { fetchMediaPackageSlugs } from "@/lib/media-package-db";
import type { MediaItem } from "@/lib/media-data";
import {
  KNOWN_REGION_SLUGS,
  KNOWN_TYPE_SLUGS,
} from "@/lib/media-keyword-landing";
import { isTier1MediaCategorySlug } from "@/lib/seo-landing-copy";

/** SEO 필수 인덱스 URL — sitemapPaths 누락 시에도 항상 포함 */
export const CRITICAL_SITEMAP_PATHS = [
  "",
  "/media",
  "/planner",
  "/media/packages",
  "/media/targets",
  "/special/fandom",
  "/faq",
  "/guides",
  "/report",
  "/cases",
  "/about",
] as const;

const TECHNICAL_MEDIA_TYPE_SLUGS = new Set<string>(KNOWN_TYPE_SLUGS);

type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export type SitemapBuildContext = {
  origin: string;
  buildTime: Date;
};

export function createSitemapBuildContext(): SitemapBuildContext {
  return {
    origin: siteUrl.replace(/\/$/, ""),
    buildTime: new Date(),
  };
}

/** `/media/type/digital` 등 기술 유형 랜딩 — PR2 canonical 정리 전까지 priority만 낮춤 */
export function isTechnicalMediaTypeLandingPath(path: string): boolean {
  if (!path.startsWith("/media/type/")) return false;
  const encoded = path.slice("/media/type/".length).split("/")[0] ?? "";
  try {
    return TECHNICAL_MEDIA_TYPE_SLUGS.has(decodeURIComponent(encoded));
  } catch {
    return TECHNICAL_MEDIA_TYPE_SLUGS.has(encoded);
  }
}

export function sitemapPriority(path: string): number {
  if (path === "") return 1;
  if (path === "/media" || path === "/packages" || path === "/media/packages")
    return 0.9;

  if (path.startsWith("/type/")) return 0.85;
  if (path.startsWith("/local/")) return 0.85;
  if (path.startsWith("/media/category/")) {
    const slug = path.split("/")[3] ?? "";
    if (isTier1MediaCategorySlug(slug)) return 0.85;
  }

  if (isTechnicalMediaTypeLandingPath(path)) return 0.55;

  if (path === "/faq" || path === "/guides" || path.startsWith("/guides/"))
    return 0.8;
  if (path.startsWith("/media/") && !path.startsWith("/media/packages"))
    return 0.7;
  if (
    path === "/planner" ||
    path === "/cases" ||
    path === "/report" ||
    path.startsWith("/cases/") ||
    path.startsWith("/report/") ||
    path.startsWith("/insights/")
  )
    return 0.75;
  if (
    path.startsWith("/industry/") ||
    path.startsWith("/special/") ||
    path.startsWith("/target/")
  )
    return 0.7;
  if (path === "/academy" || path === "/about") return 0.65;
  return 0.6;
}

function sitemapChangeFrequency(path: string): ChangeFreq {
  if (path === "" || path === "/media") return "daily";
  if (path === "/faq" || path === "/guides" || path.startsWith("/guides/"))
    return "weekly";
  if (path.startsWith("/media/")) return "weekly";
  if (path === "/report" || path.startsWith("/report/")) return "daily";
  if (path === "/cases" || path.startsWith("/cases/")) return "weekly";
  if (path.startsWith("/industry/") || path.startsWith("/local/"))
    return "monthly";
  return "weekly";
}

export function sitemapEntry(
  ctx: SitemapBuildContext,
  path: string,
  lastModified: Date = ctx.buildTime,
  overrides?: Partial<
    Pick<MetadataRoute.Sitemap[number], "priority" | "changeFrequency">
  >,
): MetadataRoute.Sitemap[number] {
  const suffix = path === "" ? "" : path;
  const ko = `${ctx.origin}/ko${suffix}`;
  const en = `${ctx.origin}/en${suffix}`;
  return {
    url: ko,
    lastModified,
    changeFrequency: overrides?.changeFrequency ?? sitemapChangeFrequency(path),
    priority: overrides?.priority ?? sitemapPriority(path),
    alternates: {
      languages: {
        ko,
        en,
        "x-default": ko,
      },
    },
  };
}

export type CatalogDerivedSitemapParts = {
  mediaPart: MetadataRoute.Sitemap;
  regionLandingPart: MetadataRoute.Sitemap;
  typeLandingPart: MetadataRoute.Sitemap;
  areaLandingPart: MetadataRoute.Sitemap;
  usedRegionFallback: boolean;
  usedTypeFallback: boolean;
};

function lastModifiedFromMedia(
  m: { updatedAt?: Date | string | null } | MediaItem,
  buildTime: Date,
): Date {
  const updated = "updatedAt" in m ? m.updatedAt : undefined;
  if (!updated) return buildTime;
  return updated instanceof Date ? updated : new Date(updated);
}

/** 카탈로그에서 매체·region/type/area 랜딩 URL 생성. 빈 카탈로그면 정적 슬러그 fallback. */
export function buildCatalogDerivedSitemapParts(
  ctx: SitemapBuildContext,
  catalog: MediaItem[],
): CatalogDerivedSitemapParts {
  const mediaPart = catalog.map((m) =>
    sitemapEntry(
      ctx,
      `/media/${m.slug?.trim() || m.id}`,
      lastModifiedFromMedia(
        m as MediaItem & { updatedAt?: Date | string | null },
        ctx.buildTime,
      ),
    ),
  );

  const regionSet = new Set<string>();
  const typeSet = new Set<string>();
  const areaSet = new Set<string>();
  for (const m of catalog) {
    if (m.region) regionSet.add(m.region);
    if (m.type) typeSet.add(m.type);
    const area = m.district || m.city;
    if (area) areaSet.add(area);
  }

  const usedRegionFallback = regionSet.size === 0;
  const usedTypeFallback = typeSet.size === 0;
  const regionSlugs = usedRegionFallback ? KNOWN_REGION_SLUGS : [...regionSet];
  const typeSlugs = usedTypeFallback ? KNOWN_TYPE_SLUGS : [...typeSet];

  const regionLandingPart = regionSlugs.map((region) =>
    sitemapEntry(ctx, `/media/region/${encodeURIComponent(region)}`),
  );
  const typeLandingPart = typeSlugs.map((type) =>
    sitemapEntry(ctx, `/media/type/${encodeURIComponent(type)}`),
  );
  const areaLandingPart = Array.from(areaSet).map((area) =>
    sitemapEntry(ctx, `/media/area/${encodeURIComponent(area)}`),
  );

  return {
    mediaPart,
    regionLandingPart,
    typeLandingPart,
    areaLandingPart,
    usedRegionFallback,
    usedTypeFallback,
  };
}

type MediaSlugRow = { id: string; slug: string | null; updatedAt: Date };

/** 전체 카탈로그 조회 실패·0건 시 slug-only 재시도 (목업 미사용). */
export async function fetchActiveMediaSlugRows(): Promise<MediaSlugRow[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const db = getPrisma();
    return await db.media.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (e) {
    console.error(
      "[sitemap] slug-only media fetch failed",
      e instanceof Error ? `${e.name}: ${e.message}` : e,
    );
    return [];
  }
}

function mediaPartFromSlugRows(
  ctx: SitemapBuildContext,
  rows: MediaSlugRow[],
): MetadataRoute.Sitemap {
  return rows.map((r) =>
    sitemapEntry(
      ctx,
      `/media/${r.slug?.trim() || r.id}`,
      r.updatedAt ?? ctx.buildTime,
    ),
  );
}

function buildStaticSitemapParts(ctx: SitemapBuildContext): MetadataRoute.Sitemap {
  const staticPathSet = new Set<string>([
    ...sitemapPaths,
    ...CRITICAL_SITEMAP_PATHS,
  ]);
  const staticPart = [...staticPathSet].map((p) => sitemapEntry(ctx, p));

  const industryPart = INDUSTRY_SLUGS.map((slug) =>
    sitemapEntry(ctx, `/industry/${slug}`),
  );
  const localSeoPart = LOCAL_SEO_LANDINGS.map((l) =>
    sitemapEntry(ctx, localSeoPath(l), ctx.buildTime),
  );
  const marketingTypePart = MARKETING_MEDIA_TYPE_SLUGS.map((t) =>
    sitemapEntry(ctx, `/type/${t}`),
  );
  const mediaCategoryPart = KNOWN_MEDIA_CATEGORY_SLUGS.map((slug) =>
    sitemapEntry(ctx, `/media/category/${slug}`),
  );
  const targetCategoryPart = KNOWN_TARGET_SLUGS.map((slug) =>
    sitemapEntry(ctx, `/target/${slug}`),
  );
  const specialMediaPart = KNOWN_SPECIAL_SLUGS.map((slug) =>
    sitemapEntry(ctx, `/special/${slug}`),
  );
  const guidePart = listGuideMeta()
    .filter((g) => !g.draft)
    .map((g) =>
      sitemapEntry(
        ctx,
        `/guides/${g.slug}`,
        new Date(g.updatedAt ?? g.publishedAt),
      ),
    );
  const blogSeoPart = BLOG_SEO_POSTS.map((p) =>
    sitemapEntry(
      ctx,
      `/blog/${p.slug}`,
      p.updatedAt ? new Date(p.updatedAt) : new Date(p.publishedAt),
    ),
  );

  return [
    ...staticPart,
    ...industryPart,
    ...localSeoPart,
    ...marketingTypePart,
    ...mediaCategoryPart,
    ...targetCategoryPart,
    ...specialMediaPart,
    ...guidePart,
    ...blogSeoPart,
  ];
}

export async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  const ctx = createSitemapBuildContext();
  const staticPart = buildStaticSitemapParts(ctx);

  let casePart: MetadataRoute.Sitemap = [];
  try {
    const cases = await getPublishedSuccessCases();
    casePart = cases.map((c) =>
      sitemapEntry(
        ctx,
        `/cases/${c.id}`,
        lastModifiedFromMedia(
          c as { updatedAt?: Date | string | null },
          ctx.buildTime,
        ),
      ),
    );
  } catch {
    /* 사례 fetch 실패 */
  }

  let catalog: MediaItem[] = [];
  let catalogFetchThrew = false;
  try {
    catalog = await fetchPublicMediaCatalog();
  } catch (e) {
    catalogFetchThrew = true;
    console.error(
      "[sitemap] fetchPublicMediaCatalog threw",
      e instanceof Error ? `${e.name}: ${e.message}` : e,
    );
  }

  let {
    mediaPart,
    regionLandingPart,
    typeLandingPart,
    areaLandingPart,
    usedRegionFallback,
    usedTypeFallback,
  } = buildCatalogDerivedSitemapParts(ctx, catalog);

  if (catalog.length === 0 && isDatabaseConfigured()) {
    const slugRows = await fetchActiveMediaSlugRows();
    if (slugRows.length > 0) {
      mediaPart = mediaPartFromSlugRows(ctx, slugRows);
      console.warn(
        `[sitemap] catalog empty${catalogFetchThrew ? " (fetch threw)" : ""} — recovered ${slugRows.length} media URLs via slug-only query`,
      );
    } else {
      console.warn(
        `[sitemap] catalog empty and slug-only query returned 0 — media detail URLs omitted; static landings retained`,
      );
    }
    if (usedRegionFallback || usedTypeFallback) {
      console.warn(
        `[sitemap] applying static region/type fallbacks (regions=${KNOWN_REGION_SLUGS.length}, types=${KNOWN_TYPE_SLUGS.length})`,
      );
    }
  }

  let insightPart: MetadataRoute.Sitemap = [];
  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const insights = await db.trendReport.findMany({
        where: { status: "published", slug: { not: null } },
        select: { slug: true, publishedAt: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
        take: 1000,
      });
      insightPart = insights
        .filter(
          (i): i is typeof i & { slug: string } => typeof i.slug === "string",
        )
        .map((i) =>
          sitemapEntry(
            ctx,
            `/insights/${i.slug}`,
            i.updatedAt ?? i.publishedAt ?? ctx.buildTime,
          ),
        );
    } catch {
      /* 인사이트 fetch 실패 */
    }
  }

  let reportPart: MetadataRoute.Sitemap = [];
  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const reports = await db.report.findMany({
        where: { published: true },
        select: { slug: true, publishedAt: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
        take: 500,
      });
      reportPart = reports.map((r) =>
        sitemapEntry(
          ctx,
          `/report/${r.slug}`,
          r.updatedAt ?? r.publishedAt ?? ctx.buildTime,
        ),
      );
    } catch {
      /* 리포트 fetch 실패 */
    }
  }

  let dbGuidePart: MetadataRoute.Sitemap = [];
  let dbEducationPart: MetadataRoute.Sitemap = [];
  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const [guides, education] = await Promise.all([
        db.guideArticle.findMany({
          where: { status: "published" },
          select: { slug: true, publishedAt: true, updatedAt: true },
          take: 500,
        }),
        db.educationArticle.findMany({
          where: { status: "published" },
          select: { slug: true, publishedAt: true, updatedAt: true },
          take: 500,
        }),
      ]);
      dbGuidePart = guides.map((g) =>
        sitemapEntry(
          ctx,
          `/guides/${g.slug}`,
          g.updatedAt ?? g.publishedAt ?? ctx.buildTime,
        ),
      );
      dbEducationPart = education.map((e) =>
        sitemapEntry(
          ctx,
          `/academy/learn/${e.slug}`,
          e.updatedAt ?? e.publishedAt ?? ctx.buildTime,
        ),
      );
    } catch {
      // DB guide/education fetch 실패
    }
  }

  let packagePart: MetadataRoute.Sitemap = [];
  try {
    const slugs = await fetchMediaPackageSlugs();
    packagePart = slugs.map((slug) =>
      sitemapEntry(ctx, `/media/packages/${slug}`),
    );
  } catch {
    /* ignore */
  }

  return [
    ...staticPart,
    ...packagePart,
    ...regionLandingPart,
    ...typeLandingPart,
    ...areaLandingPart,
    ...casePart,
    ...mediaPart,
    ...insightPart,
    ...reportPart,
    ...dbGuidePart,
    ...dbEducationPart,
  ];
}
