/**
 * 브리프 Step 2 — 카탈로그 외 커스텀 mix 라인 (세션/스냅샷용).
 */

import type { CampaignPlanCustomMixEntry } from "@/lib/campaign-plan-mix-entry";

export type BriefCustomLine = {
  lineId: string;
  name: string;
  quantity: number;
  unitPriceWon: number;
  notes?: string;
};

/** client bundle safe — store.ts 가 import 한다 */
export function newBriefCustomLineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `custom-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function createBriefCustomLine(
  partial?: Partial<Omit<BriefCustomLine, "lineId">>,
): BriefCustomLine {
  return {
    lineId: newBriefCustomLineId(),
    name: partial?.name?.trim() ?? "",
    quantity: Math.max(1, Math.floor(partial?.quantity ?? 1)),
    unitPriceWon: Math.max(0, Math.round(partial?.unitPriceWon ?? 0)),
    notes: partial?.notes?.trim() || undefined,
  };
}

export function briefCustomLineTotalWon(line: BriefCustomLine): number {
  const qty = Math.max(0, Math.floor(line.quantity));
  const unit = Math.max(0, Math.round(line.unitPriceWon));
  return qty * unit;
}

export function sumBriefCustomLinesTotalWon(
  lines: readonly BriefCustomLine[],
): number {
  return lines.reduce((sum, line) => sum + briefCustomLineTotalWon(line), 0);
}

export function normalizeBriefCustomLines(raw: unknown): BriefCustomLine[] {
  if (!Array.isArray(raw)) return [];
  const out: BriefCustomLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const lineId =
      typeof rec.lineId === "string" && rec.lineId.trim()
        ? rec.lineId.trim()
        : newBriefCustomLineId();
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const quantity =
      typeof rec.quantity === "number" ? Math.floor(rec.quantity) : NaN;
    const unitPriceWon =
      typeof rec.unitPriceWon === "number" ? Math.round(rec.unitPriceWon) : NaN;
    if (!name) continue;
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    if (!Number.isFinite(unitPriceWon) || unitPriceWon < 0) continue;
    const notes =
      typeof rec.notes === "string" && rec.notes.trim()
        ? rec.notes.trim()
        : undefined;
    out.push({ lineId, name, quantity, unitPriceWon, notes });
  }
  return out;
}

export function briefCustomLineToSnapshotEntry(
  line: BriefCustomLine,
  days: number,
): CampaignPlanCustomMixEntry {
  const quantity = Math.max(1, Math.floor(line.quantity));
  const unitPriceWon = Math.max(0, Math.round(line.unitPriceWon));
  return {
    kind: "custom",
    lineId: line.lineId,
    name: line.name.trim(),
    quantity,
    unitPriceWon,
    notes: line.notes,
    days: Math.max(1, Math.floor(days)),
    priceWon: quantity * unitPriceWon,
  };
}
