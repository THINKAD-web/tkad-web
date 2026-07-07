import type { MediaItem } from "@/lib/media-data";
import { resolveMediaQuantity } from "@/lib/media-quantity";

export type QuoteDeeplinkQuantities = Record<string, number>;
export type QuoteDeeplinkPriceOptions = Record<string, number>;

/** `id:units` 쌍 — media id 에 콤마 없음 전제 */
export function parseQuoteUnitsMap(raw: string | null): QuoteDeeplinkQuantities {
  if (!raw?.trim()) return {};
  const out: QuoteDeeplinkQuantities = {};
  for (const part of raw.split(",")) {
    const [id, unitsRaw] = part.split(":");
    if (!id?.trim()) continue;
    const u = parseInt(unitsRaw ?? "", 10);
    if (Number.isFinite(u) && u > 0) out[id.trim()] = u;
  }
  return out;
}

export function parseQuotePoMap(raw: string | null): QuoteDeeplinkPriceOptions {
  if (!raw?.trim()) return {};
  const out: QuoteDeeplinkPriceOptions = {};
  for (const part of raw.split(",")) {
    const [id, poRaw] = part.split(":");
    if (!id?.trim()) continue;
    const po = parseInt(poRaw ?? "", 10);
    if (Number.isFinite(po) && po >= 0) out[id.trim()] = po;
  }
  return out;
}

function shouldEncodeUnits(m: MediaItem, units: number): boolean {
  const def = resolveMediaQuantity(m);
  return units > 0 && units !== def;
}

/**
 * 플래너·추천·매체상세 → `/quote` 딥링크.
 * 단일 매체: `units`·`po` (기존). 복수: `unitsMap`·`poMap`.
 */
export function buildQuoteDeeplinkPath(
  mediaItems: readonly MediaItem[],
  opts?: {
    quantities?: QuoteDeeplinkQuantities;
    priceOptionIndex?: QuoteDeeplinkPriceOptions;
    period?: string;
  },
): string {
  const ids = mediaItems.map((m) => m.id).filter(Boolean);
  if (ids.length === 0) return "/quote";

  const q = new URLSearchParams();
  q.set("media", ids.join(","));

  const qtyPairs: string[] = [];
  const poPairs: string[] = [];

  for (const m of mediaItems) {
    const units = opts?.quantities?.[m.id];
    if (units != null && shouldEncodeUnits(m, units)) {
      qtyPairs.push(`${m.id}:${Math.round(units)}`);
    }
    const po = opts?.priceOptionIndex?.[m.id];
    if (po != null && po > 0) {
      poPairs.push(`${m.id}:${Math.round(po)}`);
    }
  }

  if (ids.length === 1) {
    const id = ids[0]!;
    const u = opts?.quantities?.[id];
    if (u != null && shouldEncodeUnits(mediaItems[0]!, u)) {
      q.set("units", String(Math.round(u)));
    }
    const po = opts?.priceOptionIndex?.[id];
    if (po != null && po > 0) q.set("po", String(Math.round(po)));
  } else {
    if (qtyPairs.length > 0) q.set("unitsMap", qtyPairs.join(","));
    if (poPairs.length > 0) q.set("poMap", poPairs.join(","));
  }

  if (opts?.period) q.set("period", opts.period);
  return `/quote?${q.toString()}`;
}
