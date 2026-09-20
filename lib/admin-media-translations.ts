import type { Prisma } from "@prisma/client";

export const ADMIN_MEDIA_TRANSLATION_LOCALES = ["ja", "zh"] as const;
export type AdminMediaTranslationLocale =
  (typeof ADMIN_MEDIA_TRANSLATION_LOCALES)[number];

export type AdminMediaTranslationDto = {
  locale: AdminMediaTranslationLocale;
  name: string | null;
  description: string | null;
  location: string | null;
  source: "ai" | "reviewed";
};

export type AdminMediaTranslationFormPayload = {
  name?: string | null;
  description?: string | null;
  location?: string | null;
};

export type AdminMediaTranslationsBody = {
  ja?: AdminMediaTranslationFormPayload | null;
  zh?: AdminMediaTranslationFormPayload | null;
};

function trimOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/** All three fields empty → delete row (PR5: avoid blank strings breaking resolveMediaText). */
export function isAdminTranslationPayloadEmpty(
  payload: AdminMediaTranslationFormPayload | null | undefined,
): boolean {
  if (payload == null) return true;
  return (
    !trimOrNull(payload.name) &&
    !trimOrNull(payload.description) &&
    !trimOrNull(payload.location)
  );
}

export function parseAdminMediaTranslationsBody(
  body: Record<string, unknown>,
): AdminMediaTranslationsBody | undefined {
  if (!Object.prototype.hasOwnProperty.call(body, "translations")) {
    return undefined;
  }
  const raw = body.translations;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const out: AdminMediaTranslationsBody = {};
  for (const locale of ADMIN_MEDIA_TRANSLATION_LOCALES) {
    if (!Object.prototype.hasOwnProperty.call(o, locale)) continue;
    const slice = o[locale];
    if (slice === null) {
      out[locale] = null;
      continue;
    }
    if (typeof slice !== "object" || Array.isArray(slice)) continue;
    const row = slice as Record<string, unknown>;
    out[locale] = {
      name: trimOrNull(row.name),
      description: trimOrNull(row.description),
      location: trimOrNull(row.location),
    };
  }
  return out;
}

export function normalizeAdminTranslationRows(
  rows: readonly {
    locale: string;
    name: string | null;
    description: string | null;
    location: string | null;
    source: string;
  }[],
): AdminMediaTranslationDto[] {
  return rows
    .filter(
      (r): r is typeof r & { locale: AdminMediaTranslationLocale } =>
        r.locale === "ja" || r.locale === "zh",
    )
    .map((r) => ({
      locale: r.locale,
      name: r.name,
      description: r.description,
      location: r.location,
      source: r.source === "reviewed" ? "reviewed" : "ai",
    }));
}

/** One-line list summary: ja✓ zh(AI) / ja✗ zh✗ */
export function formatAdminTranslationStatusLabel(
  translations: readonly AdminMediaTranslationDto[],
): string {
  const parts = ADMIN_MEDIA_TRANSLATION_LOCALES.map((locale) => {
    const row = translations.find((t) => t.locale === locale);
    if (!row) return `${locale}✗`;
    if (row.source === "ai") return `${locale}(AI)`;
    return `${locale}✓`;
  });
  return parts.join(" ");
}

export async function persistAdminMediaTranslations(
  tx: Prisma.TransactionClient,
  mediaId: string,
  input: AdminMediaTranslationsBody | undefined,
): Promise<void> {
  if (input === undefined) return;

  for (const locale of ADMIN_MEDIA_TRANSLATION_LOCALES) {
    if (!Object.prototype.hasOwnProperty.call(input, locale)) continue;
    const payload = input[locale];
    if (isAdminTranslationPayloadEmpty(payload)) {
      await tx.mediaTranslation.deleteMany({ where: { mediaId, locale } });
      continue;
    }
    const name = trimOrNull(payload?.name);
    const description = trimOrNull(payload?.description);
    const location = trimOrNull(payload?.location);
    await tx.mediaTranslation.upsert({
      where: { mediaId_locale: { mediaId, locale } },
      create: {
        mediaId,
        locale,
        name,
        description,
        location,
        source: "reviewed",
      },
      update: {
        name,
        description,
        location,
        source: "reviewed",
      },
    });
  }
}

export const ADMIN_MEDIA_TRANSLATIONS_INCLUDE = {
  translations: {
    select: {
      locale: true,
      name: true,
      description: true,
      location: true,
      source: true,
    },
  },
} as const;

export type AdminMediaTranslationFormFields = {
  translationJaName: string;
  translationJaLocation: string;
  translationJaDescription: string;
  translationZhName: string;
  translationZhLocation: string;
  translationZhDescription: string;
};

export function adminTranslationFormFieldsFromDto(
  translations: readonly AdminMediaTranslationDto[],
): AdminMediaTranslationFormFields & {
  translationSourceJa: "ai" | "reviewed" | null;
  translationSourceZh: "ai" | "reviewed" | null;
} {
  const ja = translations.find((t) => t.locale === "ja");
  const zh = translations.find((t) => t.locale === "zh");
  return {
    translationJaName: ja?.name ?? "",
    translationJaLocation: ja?.location ?? "",
    translationJaDescription: ja?.description ?? "",
    translationZhName: zh?.name ?? "",
    translationZhLocation: zh?.location ?? "",
    translationZhDescription: zh?.description ?? "",
    translationSourceJa: ja?.source ?? null,
    translationSourceZh: zh?.source ?? null,
  };
}

export function adminTranslationsBodyFromForm(
  form: AdminMediaTranslationFormFields,
): AdminMediaTranslationsBody {
  const slice = (name: string, location: string, description: string) => ({
    name: name.trim() || null,
    location: location.trim() || null,
    description: description.trim() || null,
  });
  return {
    ja: slice(
      form.translationJaName,
      form.translationJaLocation,
      form.translationJaDescription,
    ),
    zh: slice(
      form.translationZhName,
      form.translationZhLocation,
      form.translationZhDescription,
    ),
  };
}
