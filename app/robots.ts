import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/ko/admin",
        "/en/admin",
        "/ko/admin/",
        "/en/admin/",
        "/client",
        "/ko/client",
        "/en/client",
        "/ko/client/",
        "/en/client/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
