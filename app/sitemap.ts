import type { MetadataRoute } from "next";

const BASE_URL = process.env.SITE_URL ?? "https://tkad.co.kr";
const LOCALES = ["ko", "en"];
const ROUTES = ["", "/about", "/media", "/cases", "/contact", "/tools"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.flatMap((route) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? ("daily" as const) : ("weekly" as const),
      priority: route === "" ? 1 : 0.8,
    })),
  );
}
