import snapshot from "@/lib/locale-readiness.snapshot.json";
import type { LocaleReadinessSnapshot } from "@/lib/locale-readiness";

const SNAP = snapshot as LocaleReadinessSnapshot;

/** ko/en always indexable; ja/zh follow deploy-time readiness snapshot. */
export function isLocaleIndexingAllowed(locale: string): boolean {
  if (locale === "ko" || locale === "en") return true;
  const row = SNAP.locales[locale];
  return row?.indexAllowed === true;
}

/** PR7 alias — same as {@link isLocaleIndexingAllowed}. */
export const isLocaleReady = isLocaleIndexingAllowed;

export function localeReadinessSnapshot(): LocaleReadinessSnapshot {
  return SNAP;
}
