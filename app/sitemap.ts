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

const buildTime = new Date();
const origin = siteUrl.replace(/\/$/, "");

type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

function sitemapPriority(path: string): number {
  if (path === "") return 1;
  if (path === "/media" || path === "/packages" || path === "/media/packages")
    return 1;
  if (path === "/planner" || path === "/cases" || path === "/report") return 0.8;
  if (path.startsWith("/industry/") || path.startsWith("/local/")) return 0.7;
  if (path === "/academy" || path.startsWith("/guides")) return 0.6;
  if (path.startsWith("/cases/")) return 0.75;
  if (path.startsWith("/media/")) return 0.72;
  if (path.startsWith("/target/")) return 0.72;
  if (path.startsWith("/special/")) return 0.75;
  if (path.startsWith("/report/")) return 0.72;
  if (path.startsWith("/insights/")) return 0.72;
  return 0.8;
}

function sitemapChangeFrequency(path: string): ChangeFreq {
  if (path === "/media" || path === "/report" || path.startsWith("/report/"))
    return "daily";
  if (
    path === "/cases" ||
    path.startsWith("/cases/") ||
    path === "/academy" ||
    path.startsWith("/guides")
  )
    return "weekly";
  if (path.startsWith("/industry/") || path.startsWith("/local/"))
    return "monthly";
  if (path === "") return "daily";
  return "weekly";
}

function sitemapEntry(
  path: string,
  lastModified: Date = buildTime,
  overrides?: Partial<Pick<MetadataRoute.Sitemap[number], "priority" | "changeFrequency">>,
): MetadataRoute.Sitemap[number] {
  const suffix = path === "" ? "" : path;
  const ko = `${origin}/ko${suffix}`;
  const en = `${origin}/en${suffix}`;
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPart = sitemapPaths.map((p) => sitemapEntry(p));

  let casePart: MetadataRoute.Sitemap = [];
  try {
    const cases = await getPublishedSuccessCases();
    casePart = cases.map((c) => {
      const updated = (c as { updatedAt?: Date | string | null }).updatedAt;
      const lastmod = updated
        ? updated instanceof Date
          ? updated
          : new Date(updated)
        : buildTime;
      return sitemapEntry(`/cases/${c.id}`, lastmod);
    });
  } catch {
    /* 사례 fetch 실패 */
  }

  let mediaPart: MetadataRoute.Sitemap = [];
  let regionLandingPart: MetadataRoute.Sitemap = [];
  let typeLandingPart: MetadataRoute.Sitemap = [];
  let areaLandingPart: MetadataRoute.Sitemap = [];
  try {
    const mediaCatalog = await fetchPublicMediaCatalog();
    mediaPart = mediaCatalog.map((m) => {
      const updated = (m as { updatedAt?: Date | string | null }).updatedAt;
      const lastmod = updated
        ? updated instanceof Date
          ? updated
          : new Date(updated)
        : buildTime;
      return sitemapEntry(`/media/${m.slug?.trim() || m.id}`, lastmod);
    });

    const regionSet = new Set<string>();
    const typeSet = new Set<string>();
    const areaSet = new Set<string>();
    for (const m of mediaCatalog) {
      if (m.region) regionSet.add(m.region);
      if (m.type) typeSet.add(m.type);
      const area = m.district || m.city;
      if (area) areaSet.add(area);
    }
    regionLandingPart = Array.from(regionSet).map((region) =>
      sitemapEntry(`/media/region/${encodeURIComponent(region)}`),
    );
    typeLandingPart = Array.from(typeSet).map((type) =>
      sitemapEntry(`/media/type/${encodeURIComponent(type)}`),
    );
    areaLandingPart = Array.from(areaSet).map((area) =>
      sitemapEntry(`/media/area/${encodeURIComponent(area)}`),
    );
  } catch {
    /* 카탈로그 실패 */
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
            `/insights/${i.slug}`,
            i.updatedAt ?? i.publishedAt ?? buildTime,
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
          `/report/${r.slug}`,
          r.updatedAt ?? r.publishedAt ?? buildTime,
        ),
      );
    } catch {
      /* 리포트 fetch 실패 */
    }
  }

  // ── AI Guide articles (DB)
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
          `/guides/${g.slug}`,
          g.updatedAt ?? g.publishedAt ?? buildTime,
        ),
      );
      dbEducationPart = education.map((e) =>
        sitemapEntry(
          `/academy/learn/${e.slug}`,
          e.updatedAt ?? e.publishedAt ?? buildTime,
        ),
      );
    } catch {
      // DB guide/education fetch 실패
    }
  }

  // ── Guides — static 비-draft
  const guidePart: MetadataRoute.Sitemap = listGuideMeta()
    .filter((g) => !g.draft)
    .map((g) =>
      sitemapEntry(
        `/guides/${g.slug}`,
        new Date(g.updatedAt ?? g.publishedAt),
      ),
    );

  const industryPart: MetadataRoute.Sitemap = INDUSTRY_SLUGS.map((slug) =>
    sitemapEntry(`/industry/${slug}`),
  );

  const localSeoPart: MetadataRoute.Sitemap = LOCAL_SEO_LANDINGS.map((l) =>
    sitemapEntry(localSeoPath(l), buildTime),
  );

  const marketingTypePart: MetadataRoute.Sitemap =
    MARKETING_MEDIA_TYPE_SLUGS.map((t) => sitemapEntry(`/type/${t}`));

  const mediaCategoryPart: MetadataRoute.Sitemap =
    KNOWN_MEDIA_CATEGORY_SLUGS.map((slug) =>
      sitemapEntry(`/media/category/${slug}`),
    );

  const targetCategoryPart: MetadataRoute.Sitemap = KNOWN_TARGET_SLUGS.map(
    (slug) => sitemapEntry(`/target/${slug}`),
  );

  const specialMediaPart: MetadataRoute.Sitemap = KNOWN_SPECIAL_SLUGS.map(
    (slug) => sitemapEntry(`/special/${slug}`),
  );

  const blogSeoPart: MetadataRoute.Sitemap = BLOG_SEO_POSTS.map((p) =>
    sitemapEntry(
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
    ...blogSeoPart,
    ...regionLandingPart,
    ...typeLandingPart,
    ...areaLandingPart,
    ...casePart,
    ...mediaPart,
    ...insightPart,
    ...reportPart,
    ...guidePart,
    ...dbGuidePart,
    ...dbEducationPart,
  ];
}
