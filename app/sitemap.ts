import type { MetadataRoute } from "next";
import { buildSitemap } from "@/lib/sitemap-build";

/** Segment config must be a string literal (Next.js static analysis). */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap();
}
