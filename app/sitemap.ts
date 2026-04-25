import type { MetadataRoute } from "next";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { siteUrl, sitemapPaths } from "@/lib/seo";

const lastModified = new Date();
const origin = siteUrl.replace(/\/$/, "");

function sitemapEntry(path: string): MetadataRoute.Sitemap[number] {
  const suffix = path === "" ? "" : path;
  const ko = `${origin}/ko${suffix}`;
  const en = `${origin}/en${suffix}`;
  const isHome = path === "";
  return {
    url: ko,
    lastModified,
    changeFrequency: isHome ? "daily" : "weekly",
    priority: isHome ? 1 : path.startsWith("/cases/") ? 0.75 : 0.8,
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
  const cases = await getPublishedSuccessCases();
  const casePart = cases.map((c) => sitemapEntry(`/cases/${c.id}`));
  let mediaPart: MetadataRoute.Sitemap = [];
  try {
    const mediaCatalog = await fetchPublicMediaCatalog();
    mediaPart = mediaCatalog.map((m) => sitemapEntry(`/media/${m.id}`));
  } catch {
    // 카탈로그 fetch 실패 시 정적/사례 부분만 반환 (sitemap 자체는 살림)
  }

  // PR-5: 자동 발행된 trend report (slug 있는 published 만)
  let insightPart: MetadataRoute.Sitemap = [];
  if (isDatabaseConfigured()) {
    try {
      const db = getPrisma();
      const insights = await db.trendReport.findMany({
        where: { status: "published", slug: { not: null } },
        select: { slug: true },
        orderBy: { publishedAt: "desc" },
        take: 1000,
      });
      insightPart = insights
        .filter((i): i is { slug: string } => typeof i.slug === "string")
        .map((i) => sitemapEntry(`/insights/${i.slug}`));
    } catch {
      // 인사이트 fetch 실패 시 다른 부분만 반환
    }
  }

  return [...staticPart, ...casePart, ...mediaPart, ...insightPart];
}
