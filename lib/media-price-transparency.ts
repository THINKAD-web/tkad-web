import type { MediaItem } from "@/lib/media-data";
import {
  MEDIA_REGION_ZONES,
  regionZoneLabel,
  type MediaRegionZoneId,
} from "@/lib/media-regions";

export type MediaPriceBenchmark = {
  zoneId: string | null;
  zoneLabelKo: string;
  zoneLabelEn: string;
  regionAvgWon: number;
  mediaPriceWon: number;
  percentVsAvg: number;
  cheaperThanAvg: boolean;
  similarMinWon: number;
  similarMaxWon: number;
  similarCount: number;
  negotiationHintPct: number;
};

export function mediaMonthlyPriceWon(m: MediaItem): number {
  if (m.price > 0) return m.price;
  const opt = m.priceOptions?.[0]?.price;
  return opt && opt > 0 ? opt : 0;
}

export function resolveMediaZoneId(m: MediaItem): string | null {
  if (m.regionZone?.trim()) return m.regionZone.trim();
  const hay = `${m.district ?? ""} ${m.location ?? ""} ${m.city ?? ""}`;
  for (const z of MEDIA_REGION_ZONES) {
    if (z.districts.some((d) => hay.includes(d))) return z.id;
    if (z.aliases.some((a) => hay.includes(a))) return z.id;
  }
  if (m.region === "busan") return "busan";
  return m.region === "seoul" ? "gangnam" : null;
}

function peersInZone(
  catalog: readonly MediaItem[],
  zoneId: string | null,
  excludeId: string,
): MediaItem[] {
  return catalog.filter((m) => {
    if (m.id === excludeId) return false;
    const p = mediaMonthlyPriceWon(m);
    if (p <= 0) return false;
    const z = resolveMediaZoneId(m);
    if (zoneId) return z === zoneId;
    return m.region === catalog.find((c) => c.id === excludeId)?.region;
  });
}

export function computeMediaPriceBenchmark(
  media: MediaItem,
  catalog: readonly MediaItem[],
): MediaPriceBenchmark | null {
  const mediaPriceWon = mediaMonthlyPriceWon(media);
  if (mediaPriceWon <= 0) return null;

  const zoneId = resolveMediaZoneId(media);
  const zoneLabelKo =
    (zoneId
      ? regionZoneLabel(zoneId as MediaRegionZoneId, "ko")
      : null) ??
    (media.region === "busan" ? "부산" : "전국");
  const zoneLabelEn =
    (zoneId
      ? regionZoneLabel(zoneId as MediaRegionZoneId, "en")
      : null) ?? media.region;

  const peers = peersInZone(catalog, zoneId, media.id);
  const pool = peers.length >= 3 ? peers : catalog.filter(
    (m) => m.id !== media.id && mediaMonthlyPriceWon(m) > 0,
  );

  const prices = pool.map(mediaMonthlyPriceWon).filter((p) => p > 0);
  if (prices.length === 0) return null;

  const regionAvgWon = Math.round(
    prices.reduce((a, b) => a + b, 0) / prices.length,
  );
  const similar = peers.filter((m) => m.type === media.type);
  const similarPrices = (similar.length >= 2 ? similar : peers)
    .map(mediaMonthlyPriceWon)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);

  const percentVsAvg =
    regionAvgWon > 0
      ? Math.round(((mediaPriceWon - regionAvgWon) / regionAvgWon) * 100)
      : 0;

  return {
    zoneId,
    zoneLabelKo,
    zoneLabelEn,
    regionAvgWon,
    mediaPriceWon,
    percentVsAvg,
    cheaperThanAvg: mediaPriceWon < regionAvgWon,
    similarMinWon: similarPrices[0] ?? mediaPriceWon,
    similarMaxWon: similarPrices[similarPrices.length - 1] ?? mediaPriceWon,
    similarCount: similarPrices.length,
    negotiationHintPct: 15,
  };
}

export function formatManWon(n: number, locale: string): string {
  if (n >= 10_000) {
    const man = n / 10_000;
    return locale.startsWith("ko")
      ? `${man >= 100 ? Math.round(man) : man.toFixed(man >= 10 ? 0 : 1)}만원`
      : `₩${(n / 10_000).toFixed(0)}M KRW`;
  }
  return locale.startsWith("ko")
    ? `${n.toLocaleString("ko-KR")}원`
    : `₩${n.toLocaleString("en-US")}`;
}
