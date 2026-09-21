import { routing } from "@/i18n/routing";
import {
  intlLocaleTag,
  normalizeMediaDetailTextLocale,
  type MediaDetailTextLocale,
} from "@/lib/media-i18n";

/** JSON-LD `inLanguage` — BCP 47 (hyphen). */
export function jsonLdInLanguage(locale: string): string {
  return intlLocaleTag(locale);
}

/** Open Graph `locale` — underscore form (`ko_KR`, not `ko-KR`). */
const OPEN_GRAPH_LOCALE: Record<MediaDetailTextLocale, string> = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
  zh: "zh_CN",
};

export function openGraphLocaleTag(locale: string): string {
  return OPEN_GRAPH_LOCALE[normalizeMediaDetailTextLocale(locale)];
}

/**
 * hreflang map for a public path (no leading locale).
 * Derived from `routing.locales` so PR7 adds ja/zh without touching callers.
 */
export function buildHreflangLanguageMap(
  origin: string,
  pathSuffix: string,
  locales: readonly string[] = routing.locales,
  defaultLocale: string = routing.defaultLocale,
): Record<string, string> {
  const base = origin.replace(/\/$/, "");
  const suffix =
    pathSuffix === ""
      ? ""
      : pathSuffix.startsWith("/")
        ? pathSuffix
        : `/${pathSuffix}`;
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = `${base}/${locale}${suffix}`;
  }
  languages["x-default"] = `${base}/${defaultLocale}${suffix}`;
  return languages;
}
