import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

/** Next.js 16 can resolve `params` to undefined during some static prerender paths. */
export async function resolveLocaleParam(
  params: Promise<{ locale: string }>
): Promise<string> {
  const p = await params;
  if (p?.locale && hasLocale(routing.locales, p.locale)) {
    return p.locale;
  }
  return routing.defaultLocale;
}
