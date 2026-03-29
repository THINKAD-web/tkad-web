import type { MetadataRoute } from "next";
import { getPublishedSuccessCases } from "@/lib/public-content-queries";
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
  return [...staticPart, ...casePart];
}
