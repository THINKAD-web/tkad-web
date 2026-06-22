import type { MetadataRoute } from "next";
import { buildSitemap, SITEMAP_DYNAMIC } from "@/lib/sitemap-build";

export const dynamic = SITEMAP_DYNAMIC;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap();
}
