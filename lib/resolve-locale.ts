import { routing } from "@/i18n/routing";

/** Next.js 16 can resolve `params` to undefined during some static prerender paths. */
export async function resolveLocaleParam(
  params: Promise<{ locale: string }>
): Promise<string> {
  const p = await params;
  if (p?.locale && routing.locales.includes(p.locale as "ko" | "en")) {
    return p.locale;
  }
  return routing.defaultLocale;
}
