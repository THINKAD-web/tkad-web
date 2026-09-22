import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { publicActiveMediaWhere } from "@/lib/media-review-status";

export const LOCALE_READINESS_MEDIA_THRESHOLD = 0.95;
export const LOCALE_READINESS_MESSAGE_THRESHOLD = 1;

export const INDEXED_CONTENT_LOCALES = ["ja", "zh"] as const;
export type IndexedContentLocale = (typeof INDEXED_CONTENT_LOCALES)[number];

export type LocaleReadinessMetrics = {
  messageKeyCountEn: number;
  messageKeyCountTarget: number;
  messageKeyRatio: number;
  messagesComplete: boolean;
  missingMessageKeys: string[];
  mediaActiveTotal: number;
  mediaWithTranslation: number;
  mediaCoverageRatio: number;
  mediaCoveragePass: boolean;
  indexAllowed: boolean;
};

export type LocaleReadinessSnapshot = {
  generatedAt: string;
  messageKeyThreshold: number;
  mediaCoverageThreshold: number;
  locales: Record<string, LocaleReadinessMetrics>;
};

/** Flatten nested message JSON to dotted leaf keys. */
export function flattenMessageKeys(
  node: unknown,
  prefix = "",
): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node !== "object" || Array.isArray(node)) {
    return prefix ? [prefix] : [];
  }
  const out: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out.push(...flattenMessageKeys(value, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

export function compareMessageKeySets(
  en: unknown,
  target: unknown,
): {
  enCount: number;
  targetCount: number;
  ratio: number;
  missing: string[];
  complete: boolean;
} {
  const enKeys = new Set(flattenMessageKeys(en));
  const targetKeys = flattenMessageKeys(target);
  const missing = [...enKeys].filter((k) => !targetKeys.includes(k));
  const enCount = enKeys.size;
  const targetCount = targetKeys.length;
  const ratio = enCount === 0 ? 1 : targetCount / enCount;
  const complete = missing.length === 0;
  return { enCount, targetCount, ratio, missing, complete };
}

export async function computeMediaTranslationCoverage(
  db: PrismaClient,
  locale: IndexedContentLocale,
): Promise<{
  total: number;
  withTranslation: number;
  ratio: number;
  pass: boolean;
}> {
  const where = publicActiveMediaWhere();
  const total = await db.media.count({ where });
  if (total === 0) {
    return { total: 0, withTranslation: 0, ratio: 0, pass: false };
  }
  const withTranslation = await db.media.count({
    where: {
      AND: [
        where,
        {
          translations: {
            some: { locale },
          },
        },
      ],
    },
  });
  const ratio = withTranslation / total;
  return {
    total,
    withTranslation,
    ratio,
    pass: ratio >= LOCALE_READINESS_MEDIA_THRESHOLD,
  };
}

export function evaluateLocaleReadiness(
  locale: IndexedContentLocale,
  messages: LocaleReadinessMetrics,
): LocaleReadinessMetrics {
  const indexAllowed =
    messages.messagesComplete && messages.mediaCoveragePass;
  return { ...messages, indexAllowed };
}

export function loadLocaleReadinessSnapshotFromDisk(
  root = process.cwd(),
): LocaleReadinessSnapshot | null {
  try {
    const raw = readFileSync(
      join(root, "lib/locale-readiness.snapshot.json"),
      "utf8",
    );
    return JSON.parse(raw) as LocaleReadinessSnapshot;
  } catch {
    return null;
  }
}
