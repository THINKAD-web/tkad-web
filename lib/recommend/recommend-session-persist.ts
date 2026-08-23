import type { MediaAiRecommendFormSubmit } from "@/components/media-ai-recommend-form";
import type { ScoredMedia } from "@/lib/ai-media-recommend";
import type {
  CampaignMediaPriceOptionIndex,
  CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import type { MediaItem } from "@/lib/media-data";

/** v2: rationaleLines 포함 스키마 — v1 세션은 복원하지 않음 */
export const RECOMMEND_SESSION_STORAGE_KEY = "tkad_recommend_session_v2";
const LEGACY_RECOMMEND_SESSION_STORAGE_KEY = "tkad_recommend_session_v1";

export type RecommendPersistPhase =
  | "dashboard"
  | "noResults"
  | "list";

type StoredScored = {
  mediaId: string;
  score: number;
  reasons: ScoredMedia["reasons"];
  rationaleLines?: ScoredMedia["rationaleLines"];
};

export type RecommendSessionSnapshot = {
  v: 2;
  phase: RecommendPersistPhase;
  inputMode: "structured" | "ai";
  lastPayload: MediaAiRecommendFormSubmit;
  scored: StoredScored[];
  analysisSeed: number;
  recommendQuantities: CampaignMediaQuantities;
  recommendPriceOptionIndex: CampaignMediaPriceOptionIndex;
  savedAt: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function serializeScoredList(
  scored: readonly ScoredMedia[],
): StoredScored[] {
  return scored.map((s) => ({
    mediaId: s.item.id,
    score: s.score,
    reasons: s.reasons,
    rationaleLines: s.rationaleLines,
  }));
}

export function hydrateScoredList(
  stored: readonly StoredScored[],
  catalog: readonly MediaItem[],
): ScoredMedia[] {
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const out: ScoredMedia[] = [];
  for (const row of stored) {
    const item = byId.get(row.mediaId);
    if (!item) continue;
    out.push({
      item,
      score: row.score,
      reasons: row.reasons,
      rationaleLines: row.rationaleLines,
    });
  }
  return out;
}

function clearLegacyRecommendSession(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(LEGACY_RECOMMEND_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readRecommendSessionSnapshot(): RecommendSessionSnapshot | null {
  if (!isBrowser()) return null;
  clearLegacyRecommendSession();
  try {
    const raw = window.sessionStorage.getItem(RECOMMEND_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RecommendSessionSnapshot>;
    if (parsed.v !== 2 || !parsed.lastPayload || !Array.isArray(parsed.scored)) {
      return null;
    }
    if (
      parsed.phase !== "dashboard" &&
      parsed.phase !== "list" &&
      parsed.phase !== "noResults"
    ) {
      return null;
    }
    return parsed as RecommendSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeRecommendSessionSnapshot(
  snapshot: RecommendSessionSnapshot,
): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(
      RECOMMEND_SESSION_STORAGE_KEY,
      JSON.stringify({ ...snapshot, v: 2 as const }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearRecommendSessionSnapshot(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(RECOMMEND_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(LEGACY_RECOMMEND_SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
