/**
 * PR3 — Media detail/list text resolution for ko / en / ja / zh.
 *
 * Storage (Option C):
 * - ko (+ legacy en on `Media` columns)
 * - ja / zh on `MediaTranslation`
 *
 * Fallback (schema SSOT):
 * - ko: ko → en
 * - en: en → ko
 * - ja | zh: translation → en → ko
 *
 * Component wiring (`mediaLocalizedText`, cards, detail) is PR4 — use this helper there.
 */

import type { Prisma } from "@prisma/client";

export const MEDIA_TRANSLATION_LOCALES = ["ja", "zh"] as const;
export type MediaTranslationLocale = (typeof MEDIA_TRANSLATION_LOCALES)[number];

export type MediaTranslationRow = {
  locale: string;
  name?: string | null;
  description?: string | null;
  location?: string | null;
};

export type MediaTextField = "name" | "description" | "location";

/** Include fragment for public media queries (catalog, detail, browse include paths). */
export const MEDIA_TRANSLATIONS_FOR_MEDIA_INCLUDE = {
  translations: {
    select: {
      locale: true,
      name: true,
      description: true,
      location: true,
    },
  },
} as const satisfies Prisma.MediaInclude;

/** Select fragment for browse/list queries that use `select` instead of `include`. */
export const MEDIA_TRANSLATIONS_FOR_MEDIA_SELECT = {
  translations: {
    select: {
      locale: true,
      name: true,
      description: true,
      location: true,
    },
  },
} as const satisfies Prisma.MediaSelect;

export type MediaDetailTextLocale = "ko" | "en" | "ja" | "zh";

export function normalizeMediaDetailTextLocale(locale: string): MediaDetailTextLocale {
  const base = locale.toLowerCase().split("-")[0];
  if (base === "ko") return "ko";
  if (base === "ja") return "ja";
  if (base === "zh") return "zh";
  return "en";
}

function trimText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function pickMediaTranslationField(
  translations: readonly MediaTranslationRow[] | null | undefined,
  locale: MediaTranslationLocale,
  field: MediaTextField,
): string | null | undefined {
  const row = translations?.find((t) => t.locale === locale);
  if (!row) return undefined;
  return row[field];
}

export type ResolveMediaTextInput = {
  locale: string;
  ko: string | null | undefined;
  en?: string | null | undefined;
  /** ja/zh field value (from `MediaTranslation` for the active locale). */
  translation?: string | null | undefined;
};

/**
 * Single-field resolver — pass ko/en columns and optional ja/zh translation string.
 */
export function resolveMediaText(input: ResolveMediaTextInput): string {
  const bucket = normalizeMediaDetailTextLocale(input.locale);
  const ko = trimText(input.ko);
  const en = trimText(input.en);
  const tr = trimText(input.translation);

  if (bucket === "ko") return ko || en;
  if (bucket === "en") return en || ko;
  return tr || en || ko;
}
