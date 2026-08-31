/**
 * CampaignPlan `mediaMix` JSON — catalog / custom discriminator.
 *
 * 하위호환: `kind` 없는 row → catalog 로 간주 (기존 저장 플랜).
 */

import type { CampaignPlanMediaLine } from "@/lib/campaign-plan-schema";

/** 카탈로그 매체 라인 — 저장 시 `kind: "catalog"` 권장, 생략 시 legacy */
export type CampaignPlanCatalogMixEntry = CampaignPlanMediaLine & {
  kind?: "catalog";
};

/** 카탈로그에 없는 수동 항목 — impressions/cpm 없음 (산정 불가) */
export type CampaignPlanCustomMixEntry = {
  kind: "custom";
  lineId: string;
  name: string;
  quantity: number;
  unitPriceWon: number;
  notes?: string;
  /** 스냅샷 시점 캠페인 일수 (기록용) */
  days: number;
  /** quantity × unitPriceWon — 저장 시점 denormalize */
  priceWon: number;
};

export type CampaignPlanMixEntry =
  | CampaignPlanCatalogMixEntry
  | CampaignPlanCustomMixEntry;

export function isCustomMixEntry(
  entry: CampaignPlanMixEntry,
): entry is CampaignPlanCustomMixEntry {
  return entry.kind === "custom";
}

export function isCatalogMixEntry(
  entry: CampaignPlanMixEntry,
): entry is CampaignPlanCatalogMixEntry {
  return entry.kind !== "custom";
}

export function filterCatalogMixEntries(
  mediaMix: readonly CampaignPlanMixEntry[],
): CampaignPlanCatalogMixEntry[] {
  return mediaMix.filter(isCatalogMixEntry);
}

export function filterCustomMixEntries(
  mediaMix: readonly CampaignPlanMixEntry[],
): CampaignPlanCustomMixEntry[] {
  return mediaMix.filter(isCustomMixEntry);
}

/** legacy `CampaignPlanMediaLine` → catalog entry (kind optional) */
export function catalogLineToMixEntry(
  line: CampaignPlanMediaLine,
): CampaignPlanCatalogMixEntry {
  return { ...line, kind: "catalog" };
}

export function customMixEntryTotalWon(
  entry: Pick<CampaignPlanCustomMixEntry, "quantity" | "unitPriceWon" | "priceWon">,
): number {
  if (
    typeof entry.priceWon === "number" &&
    Number.isFinite(entry.priceWon) &&
    entry.priceWon >= 0
  ) {
    return Math.round(entry.priceWon);
  }
  const qty = Math.max(0, Math.floor(entry.quantity));
  const unit = Math.max(0, Math.round(entry.unitPriceWon));
  return qty * unit;
}

export function sumCustomMixTotalWon(
  entries: readonly CampaignPlanCustomMixEntry[],
): number {
  return entries.reduce((sum, e) => sum + customMixEntryTotalWon(e), 0);
}

function normalizeCatalogEntry(raw: Record<string, unknown>): CampaignPlanCatalogMixEntry | null {
  const mediaId = typeof raw.mediaId === "string" ? raw.mediaId.trim() : "";
  if (!mediaId) return null;
  const units = typeof raw.units === "number" ? Math.floor(raw.units) : NaN;
  const days = typeof raw.days === "number" ? Math.floor(raw.days) : NaN;
  if (!Number.isFinite(units) || units <= 0) return null;
  if (!Number.isFinite(days) || days <= 0) return null;
  const name = typeof raw.name === "string" ? raw.name : mediaId;
  const priceWon =
    typeof raw.priceWon === "number" && Number.isFinite(raw.priceWon)
      ? Math.max(0, Math.round(raw.priceWon))
      : 0;
  const impressions =
    typeof raw.impressions === "number" && Number.isFinite(raw.impressions)
      ? Math.max(0, Math.round(raw.impressions))
      : 0;
  const cpmRaw = raw.cpmWon;
  const cpmWon =
    cpmRaw === null || cpmRaw === undefined
      ? null
      : typeof cpmRaw === "number" && Number.isFinite(cpmRaw)
        ? cpmRaw
        : null;
  return {
    kind: raw.kind === "catalog" ? "catalog" : undefined,
    mediaId,
    slug: typeof raw.slug === "string" ? raw.slug : null,
    name,
    units,
    days,
    optionId: typeof raw.optionId === "string" ? raw.optionId : undefined,
    priceWon,
    priceIsEstimate: raw.priceIsEstimate === true,
    impressions,
    cpmWon,
  };
}

function normalizeCustomEntry(raw: Record<string, unknown>): CampaignPlanCustomMixEntry | null {
  const lineId = typeof raw.lineId === "string" ? raw.lineId.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!lineId || !name) return null;
  const quantity = typeof raw.quantity === "number" ? Math.floor(raw.quantity) : NaN;
  const unitPriceWon =
    typeof raw.unitPriceWon === "number" ? Math.round(raw.unitPriceWon) : NaN;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (!Number.isFinite(unitPriceWon) || unitPriceWon < 0) return null;
  const days =
    typeof raw.days === "number" && Number.isFinite(raw.days) && raw.days > 0
      ? Math.floor(raw.days)
      : 30;
  const priceWon =
    typeof raw.priceWon === "number" && Number.isFinite(raw.priceWon)
      ? Math.max(0, Math.round(raw.priceWon))
      : quantity * unitPriceWon;
  const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : undefined;
  return {
    kind: "custom",
    lineId,
    name,
    quantity,
    unitPriceWon,
    notes,
    days,
    priceWon,
  };
}

/** DB/JSON raw row → typed entry. 알 수 없는 row 는 drop */
export function normalizeMixEntry(raw: unknown): CampaignPlanMixEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (rec.kind === "custom") return normalizeCustomEntry(rec);
  return normalizeCatalogEntry(rec);
}

export function normalizeMediaMix(raw: unknown): CampaignPlanMixEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: CampaignPlanMixEntry[] = [];
  for (const row of raw) {
    const entry = normalizeMixEntry(row);
    if (entry) out.push(entry);
  }
  return out;
}
