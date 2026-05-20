import type { MediaItem } from "@/lib/media-data";

function sameZone(a: MediaItem, b: MediaItem): boolean {
  const za = a.regionZone?.trim() || a.region;
  const zb = b.regionZone?.trim() || b.region;
  return za === zb;
}

function priceWithinRatio(
  base: number,
  other: number,
  ratio: number,
): boolean {
  const denom = Math.max(base, 1);
  return Math.abs(other - base) / denom <= ratio;
}

function impressionsOf(m: MediaItem): number | undefined {
  const v = m.impressions ?? m.monthlyFootTraffic;
  return typeof v === "number" && v > 0 ? v : undefined;
}

function impressionsWithinRatio(
  base: number | undefined,
  other: number | undefined,
  ratio: number,
): boolean {
  if (base == null || other == null) return true;
  const denom = Math.max(base, 1);
  return Math.abs(other - base) / denom <= ratio;
}

/**
 * 같은 권역 + 가격 ±30% + 노출 ±50%, popularityScore 내림차순, 최대 limit.
 */
export function getDataDrivenSimilarMedia(
  catalog: MediaItem[],
  item: MediaItem,
  limit = 4,
): MediaItem[] {
  const others = catalog.filter((m) => m.id !== item.id);
  const refImp = impressionsOf(item);

  const strict = others.filter(
    (m) =>
      sameZone(item, m) &&
      priceWithinRatio(item.price, m.price, 0.3) &&
      impressionsWithinRatio(refImp, impressionsOf(m), 0.5),
  );

  const pick = (pool: MediaItem[]) =>
    pool
      .slice()
      .sort(
        (a, b) =>
          (b.popularityScore ?? 0) - (a.popularityScore ?? 0) ||
          Math.abs(a.price - item.price) - Math.abs(b.price - item.price),
      )
      .slice(0, limit);

  if (strict.length >= limit) return pick(strict);

  const relaxedImp = others.filter(
    (m) =>
      sameZone(item, m) &&
      priceWithinRatio(item.price, m.price, 0.3) &&
      !strict.some((s) => s.id === m.id),
  );
  const merged = [...strict, ...relaxedImp];
  if (merged.length >= limit) return pick(merged);

  const relaxedPrice = others.filter(
    (m) => sameZone(item, m) && !merged.some((x) => x.id === m.id),
  );
  const merged2 = [...merged, ...relaxedPrice];
  if (merged2.length >= limit) return pick(merged2);

  const sameRegion = others.filter(
    (m) => m.region === item.region && !merged2.some((x) => x.id === m.id),
  );
  return pick([...merged2, ...sameRegion]);
}
