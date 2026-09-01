/**
 * Online catalog browse main IDs (PR1b-1).
 * Symmetric to offline mains (ooh, transit, …) — `catalog_channel` carries offline/online;
 * these identify the ad product family within online.
 */

export const ONLINE_BROWSE_MAIN_IDS = [
  "search",
  "display",
  "video",
  "sns",
  "message",
  "local",
] as const;

export type OnlineBrowseMainId = (typeof ONLINE_BROWSE_MAIN_IDS)[number];

export const ONLINE_BROWSE_MAIN_SET = new Set<string>(ONLINE_BROWSE_MAIN_IDS);

/** Offline-only browse mains (`lib/media-browse-categories.ts`). */
export const OFFLINE_BROWSE_MAIN_IDS = [
  "ooh",
  "transit",
  "shelter",
  "shopping",
  "entertainment",
  "lifestyle",
  "building",
  "education",
  "culture",
  "network",
  "etc",
] as const;

export type OfflineBrowseMainId = (typeof OFFLINE_BROWSE_MAIN_IDS)[number];

export const OFFLINE_BROWSE_MAIN_SET = new Set<string>(OFFLINE_BROWSE_MAIN_IDS);

/** Retired browse main ids — no main-level alias (see docs/audit/pr1b1-legacy-digital-alias.md). */
export const LEGACY_BROWSE_MAIN_ALIASES: Record<string, OnlineBrowseMainId> =
  {};

export function normalizeBrowseMainId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v === "digital" || v === "online") return null;
  return LEGACY_BROWSE_MAIN_ALIASES[v as OnlineBrowseMainId] ?? v;
}

export function isOnlineBrowseMain(main: string | null | undefined): boolean {
  const id = normalizeBrowseMainId(main);
  return id != null && ONLINE_BROWSE_MAIN_SET.has(id);
}

export function isOfflineBrowseMain(main: string | null | undefined): boolean {
  const id = normalizeBrowseMainId(main);
  return id != null && OFFLINE_BROWSE_MAIN_SET.has(id);
}
