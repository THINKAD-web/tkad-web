import {
  isPlannerIndustryKey,
  type PlannerIndustryKey,
} from "@/lib/planner/types";
import type { CommunityCategory } from "@/lib/community/types";

export type MediaRecommendMetadata = {
  budgetWon: number;
  region: string;
  industry: string;
};

export type ExecutionReviewMetadata = {
  mediaId: string;
  mediaName?: string;
  rating: number;
  mediaReviewId?: string;
};

export type CommunityPostMetadataInput = Record<string, unknown> | null;

export function parseMetadataRecord(
  raw: unknown,
): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return null;
}

export function normalizeIndustryKey(raw: string): PlannerIndustryKey {
  const t = raw.trim().toLowerCase();
  if (isPlannerIndustryKey(raw)) return raw;
  const map: Record<string, PlannerIndustryKey> = {
    indfb: "indFb",
    fmcg: "indFb",
    fb: "indFb",
    food: "indFb",
    "f&b": "indFb",
    indretail: "indRetail",
    retail: "indRetail",
    indtech: "indTech",
    tech: "indTech",
    indfinance: "indFinance",
    finance: "indFinance",
    indent: "indEnt",
    entertainment: "indEnt",
  };
  return map[t] ?? "indOther";
}

export function asMediaRecommendMetadata(
  meta: CommunityPostMetadataInput,
): MediaRecommendMetadata | null {
  const m = parseMetadataRecord(meta);
  if (!m) return null;
  const budgetWon = Number(m.budgetWon);
  const region = typeof m.region === "string" ? m.region.trim() : "";
  const industry = typeof m.industry === "string" ? m.industry.trim() : "";
  if (!Number.isFinite(budgetWon) || budgetWon <= 0 || !region || !industry) {
    return null;
  }
  return { budgetWon: Math.round(budgetWon), region, industry };
}

export function asExecutionReviewMetadata(
  meta: CommunityPostMetadataInput,
): Omit<ExecutionReviewMetadata, "mediaReviewId"> | null {
  const m = parseMetadataRecord(meta);
  if (!m) return null;
  const mediaId = typeof m.mediaId === "string" ? m.mediaId.trim() : "";
  const rating = Number(m.rating);
  const mediaName =
    typeof m.mediaName === "string" ? m.mediaName.trim() : undefined;
  if (!mediaId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }
  return { mediaId, rating, mediaName: mediaName || undefined };
}

export function categoryNeedsMetadata(category: CommunityCategory): boolean {
  return category === "media_recommend" || category === "execution_review";
}
