import type { PlanCartAddedFrom, PlanCartAddonLine, PlanCartItem } from "@/lib/plan-cart";

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

function normalizeItemAddonLines(raw: unknown): PlanCartAddonLine[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const lines: PlanCartAddonLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id) continue;
    const name = typeof o.name === "string" ? o.name : "";
    const unitPriceWon =
      typeof o.unitPriceWon === "number" && Number.isFinite(o.unitPriceWon)
        ? Math.max(0, Math.round(o.unitPriceWon))
        : 0;
    const quantity =
      typeof o.quantity === "number" &&
      Number.isFinite(o.quantity) &&
      o.quantity > 0
        ? Math.round(o.quantity)
        : 1;
    lines.push({ id, name, unitPriceWon, quantity });
  }
  return lines.length > 0 ? lines : undefined;
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
      quantity:
        typeof o.quantity === "number" &&
        Number.isFinite(o.quantity) &&
        o.quantity > 0
          ? Math.round(o.quantity)
          : undefined,
      priceOptionIndex:
        typeof o.priceOptionIndex === "number" &&
        Number.isFinite(o.priceOptionIndex) &&
        o.priceOptionIndex >= 0
          ? Math.round(o.priceOptionIndex)
          : undefined,
      gradeSelections: Array.isArray(o.gradeSelections)
        ? o.gradeSelections
            .map((row) => {
              if (!row || typeof row !== "object") return null;
              const r = row as Record<string, unknown>;
              const priceOptionIndex =
                typeof r.priceOptionIndex === "number" &&
                Number.isFinite(r.priceOptionIndex) &&
                r.priceOptionIndex >= 0
                  ? Math.round(r.priceOptionIndex)
                  : null;
              const quantity =
                typeof r.quantity === "number" &&
                Number.isFinite(r.quantity) &&
                r.quantity > 0
                  ? Math.round(r.quantity)
                  : null;
              if (priceOptionIndex == null || quantity == null) return null;
              return { priceOptionIndex, quantity };
            })
            .filter(
              (
                x,
              ): x is { priceOptionIndex: number; quantity: number } =>
                x !== null,
            )
        : undefined,
      optionSelections: Array.isArray(o.optionSelections)
        ? o.optionSelections
            .map((row) => {
              if (!row || typeof row !== "object") return null;
              const r = row as Record<string, unknown>;
              const priceOptionIndex =
                typeof r.priceOptionIndex === "number" &&
                Number.isFinite(r.priceOptionIndex) &&
                r.priceOptionIndex >= 0
                  ? Math.round(r.priceOptionIndex)
                  : null;
              const quantity =
                typeof r.quantity === "number" &&
                Number.isFinite(r.quantity) &&
                r.quantity > 0
                  ? Math.round(r.quantity)
                  : null;
              if (priceOptionIndex == null || quantity == null) return null;
              return { priceOptionIndex, quantity };
            })
            .filter(
              (
                x,
              ): x is { priceOptionIndex: number; quantity: number } =>
                x !== null,
            )
        : undefined,
      addonLines: normalizeItemAddonLines(o.addonLines),
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
