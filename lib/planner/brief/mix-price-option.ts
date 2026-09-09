/**
 * 상세 플래너 믹스 — 사용자가 고른 priceOptions 인덱스.
 *
 * 계산 엔진(scoreMediaCandidates)은 건드리지 않는다.
 * 금액은 기존 `resolveMediaProductPrice` 를 기본으로 두고,
 * 사용자가 옵션을 고른 뒤에만 그 등록가를 쓴다.
 */

import type { MediaItem } from "@/lib/media-data";
import { getMediaPackageOptions } from "@/lib/media-quantity";
import { resolveMediaProductPrice } from "@/lib/metrics/media-price-adapter";
import { resolveOptionDays } from "@/lib/metrics/price";
import type { PriceResult } from "@/lib/metrics/types";

const PO_ID_RE = /^po-(\d+)$/;

export function optionIdForPriceOptionIndex(index: number): string {
  return `po-${Math.max(0, Math.floor(index))}`;
}

export function parsePriceOptionIndexFromId(
  optionId: string | undefined | null,
): number | undefined {
  if (!optionId) return undefined;
  const m = PO_ID_RE.exec(optionId);
  if (!m) return undefined;
  const idx = Number(m[1]);
  return Number.isFinite(idx) && idx >= 0 ? idx : undefined;
}

/** 비행 일수에 맞는 등록 상품 → priceOptions 인덱스. 없으면 0. */
export function defaultMixPriceOptionIndex(
  media: MediaItem,
  days: number,
): number {
  const result = resolveMediaProductPrice(media, days);
  const fromId = parsePriceOptionIndexFromId(result?.option?.id);
  if (
    fromId != null &&
    Array.isArray(media.priceOptions) &&
    media.priceOptions[fromId]
  ) {
    return fromId;
  }
  return 0;
}

/** 사용자 선택이 있으면 그것, 없으면 비행 일수 추천. */
export function effectiveMixPriceOptionIndex(
  media: MediaItem,
  days: number,
  stored: number | undefined,
): number {
  if (
    stored != null &&
    Number.isFinite(stored) &&
    stored >= 0 &&
    Array.isArray(media.priceOptions) &&
    media.priceOptions[stored]
  ) {
    return Math.floor(stored);
  }
  return defaultMixPriceOptionIndex(media, days);
}

export function priceOptionIndexFromOptionId(
  media: MediaItem,
  optionId: string | undefined | null,
): number | undefined {
  if (!optionId) return undefined;
  const fromPo = parsePriceOptionIndexFromId(optionId);
  if (
    fromPo != null &&
    Array.isArray(media.priceOptions) &&
    media.priceOptions[fromPo]
  ) {
    return fromPo;
  }
  const options = getMediaPackageOptions(media, true);
  const byKey = options.findIndex((o) => o.key === optionId);
  if (byKey >= 0) return byKey;
  return undefined;
}

export function normalizeMixPriceOptionIndex(
  raw: unknown,
): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? Math.floor(v) : NaN;
    if (Number.isFinite(n) && n >= 0) out[id] = n;
  }
  return out;
}

export function pruneMixPriceOptionIndex(
  index: Record<string, number>,
  mixUnits: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const id of Object.keys(mixUnits)) {
    if ((mixUnits[id] ?? 0) <= 0) continue;
    const v = index[id];
    if (v != null && Number.isFinite(v) && v >= 0) next[id] = Math.floor(v);
  }
  return next;
}

/**
 * 라인 원가. 사용자 선택이 있을 때만 해당 옵션 등록가를 쓰고,
 * 없으면 기존 `resolveMediaProductPrice`(비행 일수)와 동일.
 */
export function resolveMixLineProductPrice(
  media: MediaItem,
  days: number,
  storedIndex: number | undefined,
): PriceResult | null {
  if (
    storedIndex != null &&
    Number.isFinite(storedIndex) &&
    storedIndex >= 0 &&
    Array.isArray(media.priceOptions)
  ) {
    const idx = Math.floor(storedIndex);
    const opt = media.priceOptions[idx];
    const price = opt?.price;
    if (opt && typeof price === "number" && Number.isFinite(price) && price > 0) {
      const optDays =
        resolveOptionDays(opt.period ?? media.pricePeriod) ?? days;
      return {
        amount: price,
        basis: "exact",
        isEstimate: false,
        option: {
          id: optionIdForPriceOptionIndex(idx),
          days: optDays,
          price,
          label: opt.label,
        },
      };
    }
  }
  return resolveMediaProductPrice(media, days);
}
