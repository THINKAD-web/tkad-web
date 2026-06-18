import type { PlanCartAddedFrom, PlanCartItem } from "@/lib/plan-cart";

const ADDED_FROM: PlanCartAddedFrom[] = [
  "ai_recommend",
  "planner",
  "search",
  "map",
  "package",
];

function coerceAddedFrom(raw: unknown): PlanCartAddedFrom {
  if (typeof raw === "string" && ADDED_FROM.includes(raw as PlanCartAddedFrom)) {
    return raw as PlanCartAddedFrom;
  }
  return "search";
}

/** API 저장 전 cart item 정규화 — localStorage 레거시·누락 필드 보정 */
export function normalizePlanCartItemsForSave(raw: unknown): PlanCartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanCartItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const mediaId = typeof o.mediaId === "string" ? o.mediaId.trim() : "";
    if (!mediaId) continue;
    const mediaName = typeof o.mediaName === "string" ? o.mediaName : mediaId;
    out.push({
      mediaId,
      mediaName,
      mediaType: typeof o.mediaType === "string" ? o.mediaType : "",
      region: typeof o.region === "string" ? o.region : "",
      price:
        typeof o.price === "number" && Number.isFinite(o.price) ? o.price : 0,
      thumbnailUrl:
        typeof o.thumbnailUrl === "string" && o.thumbnailUrl.trim()
          ? o.thumbnailUrl
          : undefined,
      addedFrom: coerceAddedFrom(o.addedFrom),
      addedAt:
        typeof o.addedAt === "string" && o.addedAt.trim()
          ? o.addedAt
          : new Date().toISOString(),
    });
  }
  return out;
}
