import type { MediaItem } from "@/lib/media-data";
import { resolveMediaQuantity } from "@/lib/media-quantity";
import { resolveMediaPriceForDisplay } from "@/lib/metrics/media-price-adapter";
import { daysToPeriodKey } from "@/lib/metrics/quote-params";

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
    campaignDays?: number;
    flightStart?: string;
    flightEnd?: string;
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
  if (opts?.campaignDays != null && opts.campaignDays > 0 && ids.length === 1) {
    q.set("campaignDays", String(Math.round(opts.campaignDays)));
    if (opts.flightStart) q.set("start", opts.flightStart);
    if (opts.flightEnd) q.set("end", opts.flightEnd);
  }
  return `/quote?${q.toString()}`;
}

// ─────────────────────────────────────────────────────────────────
// Canonical 견적 링크 — `?media&optionId&days` (D-06)
// ─────────────────────────────────────────────────────────────────

/**
 * `PriceOption.id` → 기존 `po` 인덱스.
 * 어댑터가 붙이는 id 형식은 `base` | `po-{idx}` 이다.
 */
export function quoteOptionIdToIndex(
  optionId: string | null | undefined,
): number | null {
  if (!optionId) return null;
  if (optionId === "base") return 0;
  const m = /^po-(\d+)$/.exec(optionId);
  if (!m) return null;
  const idx = Number.parseInt(m[1]!, 10);
  return Number.isFinite(idx) && idx >= 0 ? idx : null;
}

/**
 * 매체 1건 견적 딥링크 — **실제 적용 상품에서 파라미터를 유도한다.**
 *
 * 기존 경로는 `pricePeriod`(단가 주기) 문자열을 그대로 실어 보내서,
 * 7일 상품인 M-CITY 에 `period=1day` 가 붙었다. 여기서는 `resolvePrice`
 * 가 고른 상품의 일수를 `days` 로 싣고, `period` 는 운영 6키에 정확히
 * 대응할 때만 붙인다 (호환용).
 *
 * `campaignDays` · `po` 는 기존 `/quote` 리더 호환을 위해 함께 싣는다.
 */
export function buildMediaQuoteDeeplinkPath(
  media: MediaItem,
  opts?: { days?: number; units?: number },
): string {
  const requestedDays = opts?.days && opts.days > 0 ? Math.round(opts.days) : 30;
  const resolved = resolveMediaPriceForDisplay(media, requestedDays);

  const q = new URLSearchParams();
  q.set("media", media.id);

  const days = resolved?.days ?? requestedDays;
  q.set("days", String(days));
  // 기존 리더 호환 — campaignDays 를 우선 읽고 period 로 폴백한다
  q.set("campaignDays", String(days));

  const periodKey = daysToPeriodKey(days);
  if (periodKey) q.set("period", periodKey);

  if (resolved?.optionId) {
    q.set("optionId", resolved.optionId);
    const idx = quoteOptionIdToIndex(resolved.optionId);
    if (idx != null && idx > 0) q.set("po", String(idx));
  }

  if (opts?.units != null && shouldEncodeUnits(media, opts.units)) {
    q.set("units", String(Math.round(opts.units)));
  }

  return `/quote?${q.toString()}`;
}
