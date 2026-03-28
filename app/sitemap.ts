import type { MetadataRoute } from "next";
import { allPublicSitemapPaths, siteUrl } from "@/lib/seo";

const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return allPublicSitemapPaths().map(({ locale, path }) => {
    const url = `${siteUrl}/${locale}${path === "" ? "" : path}`;
    const isHome = path === "";
    return {
      url,
      lastModified,
      changeFrequency: isHome ? "daily" : "weekly",
      priority: isHome ? 1 : path.startsWith("/cases/") ? 0.75 : 0.8,
    };
  });
}
