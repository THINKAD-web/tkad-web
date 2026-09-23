/**
 * PR3 — Media detail/list text resolution for ko / en / ja / zh.
 *
 * Storage (Option C):
 * - ko (+ legacy en on `Media` columns)
 * - ja / zh on `MediaTranslation`
 *
 * Fallback (schema SSOT):
 * - ko: ko → en  (see below — production DB never hits this for ko today)
 * - en: en → ko
 * - ja | zh: translation → en → ko
 *
 * Schema (`Media`): `name` / `location` are required `String`; `description` is
 * `String?`. Callers may still pass `null`/`undefined` (partial DTOs) or
 * whitespace-only strings after trim.
 *
 * DB audit (2026-09-20, connected Neon): among 1066 `media` rows and 1047
 * `publicActiveMediaWhere()` rows, zero rows with trim-empty `name`, `location`,
 * or `description`, and zero `description IS NULL`. So ko→en on locale `ko` does
 * not trigger for current catalog data — it mirrors `mediaLocalizedText` and
 * guards API/edge input. en→ko remains meaningful when `nameEn` is unset.
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

  if (bucket === "ko") {
    // Defensive: DB always has non-empty ko today; mirrors mediaLocalizedText.
    return ko || en;
  }
  if (bucket === "en") return en || ko;
  return tr || en || ko;
}

/** BCP 47 tag for `Intl` / `toLocaleString`. */
export function intlLocaleTag(locale: string): string {
  const bucket = normalizeMediaDetailTextLocale(locale);
  if (bucket === "ko") return "ko-KR";
  if (bucket === "ja") return "ja-JP";
  if (bucket === "zh") return "zh-CN";
  return "en-US";
}

export type MediaTextSource = {
  name: string;
  nameEn?: string | null;
  location: string;
  locationEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  translations?: readonly MediaTranslationRow[] | null;
};

export function resolveMediaField(
  locale: string,
  field: MediaTextField,
  media: MediaTextSource,
): string {
  const bucket = normalizeMediaDetailTextLocale(locale);
  const ko =
    field === "name"
      ? media.name
      : field === "location"
        ? media.location
        : media.description;
  const en =
    field === "name"
      ? media.nameEn
      : field === "location"
        ? media.locationEn
        : media.descriptionEn;
  const translation =
    bucket === "ja" || bucket === "zh"
      ? pickMediaTranslationField(media.translations, bucket, field)
      : undefined;
  return resolveMediaText({ locale, ko, en, translation });
}

export function resolveMediaDisplayName(
  media: MediaTextSource,
  locale: string,
): string {
  return resolveMediaField(locale, "name", media);
}

/** Success cases: `summaryKo` only in schema — en/ja/zh use PR3 fallback chain. */
export function resolveSuccessCaseTitle(
  item: { titleKo: string; titleEn?: string | null },
  locale: string,
): string {
  return resolveMediaText({ locale, ko: item.titleKo, en: item.titleEn });
}

export function resolveSuccessCaseSummary(
  item: { summaryKo: string },
  locale: string,
): string {
  return resolveMediaText({ locale, ko: item.summaryKo, en: undefined });
}

/**
 * Detail overview accordion — long-form copy first, then DB description with PR3 fallback.
 * ja/zh must not use `catalogDescriptionEn` (often Korean when `descriptionEn` is empty).
 */
export function resolveMediaOverviewBody(
  media: MediaTextSource & {
    catalogDescription?: string | null;
    catalogDescriptionEn?: string | null;
    longDescriptionKo?: string | null;
    longDescriptionEn?: string | null;
    descriptionEn?: string | null;
  },
  locale: string,
): string {
  const bucket = normalizeMediaDetailTextLocale(locale);
  const long =
    bucket === "ko"
      ? media.longDescriptionKo?.trim()
      : media.longDescriptionEn?.trim();
  if (long) return long;
  if (bucket === "ko") {
    const cat = media.catalogDescription?.trim();
    if (cat) return cat;
  }
  if (bucket === "en") {
    const en = media.descriptionEn?.trim();
    if (en) return en;
  }
  return resolveMediaField(locale, "description", media).trim();
}
