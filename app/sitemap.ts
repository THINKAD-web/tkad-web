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

const buildTime = new Date();
const origin = siteUrl.replace(/\/$/, "");

/** 핵심 랜딩(검색 유입·전환) 우선순위 살짝 상향 */
function staticPathPriority(path: string): number {
  if (path === "") return 1;
  if (
    path === "/media" ||
    path === "/media/packages" ||
    path === "/packages" ||
    path === "/planner" ||
    path === "/quote"
  )
    return 0.95;
  if (
    path === "/compare" ||
    path === "/insights" ||
    path === "/cases" ||
    path === "/report"
  )
    return 0.9;
  return 0.8;
}

function sitemapEntry(
  path: string,
  lastModified: Date = buildTime,
): MetadataRoute.Sitemap[number] {
  const suffix = path === "" ? "" : path;
  const ko = `${origin}/ko${suffix}`;
  const en = `${origin}/en${suffix}`;
  const isHome = path === "";
  const priority = isHome
    ? 1
    : path.startsWith("/cases/") && !path.includes("//")
      ? 0.75
      : path.startsWith("/media/") ||
          path.startsWith("/insights/") ||
          path.startsWith("/report/")
        ? 0.72
        : staticPathPriority(path);
  return {
    url: ko,
    lastModified,
    changeFrequency: isHome ? "daily" : "weekly",
    priority,
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

  // ── Success cases — DB updatedAt 우선
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
    // 사례 fetch 실패 → 사례 부분 없이 진행
  }

  // ── Media catalog — fetchPublicMediaCatalog 의 updatedAt 우선
  // ── Tier 2 — region/type 키워드 랜딩 자동 생성 (DB unique values)
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
      return sitemapEntry(`/media/${m.id}`, lastmod);
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
    // 카탈로그 실패 → 매체/랜딩 부분 없이 진행
  }

  // ── Trend reports — published + slug 만, updatedAt/publishedAt 우선
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
      // 인사이트 fetch 실패
    }
  }

  // ── Trend reports (Report model) — published + slug
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
      // 리포트 fetch 실패
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
