import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import {
  prismaNetworkToMediaItem,
  type MediaNetworkWithLocs,
} from "@/lib/media-network-public";
import {
  NETWORK_TYPE_LABELS,
  parsePackageOptions,
} from "@/lib/media-network-types";
import { resolveTrafficPattern } from "@/lib/media-traffic-estimate";

function manWonToWon(man: number): number {
  return Math.round(man * 10_000);
}

function buildPriceOptions(n: MediaNetworkWithLocs): MediaPriceOption[] {
  const tiers = parsePackageOptions(n.packageOptions);
  const out: MediaPriceOption[] = [];

  for (const t of tiers) {
    out.push({
      label: `${t.units.toLocaleString("ko-KR")}면 패키지`,
      price: manWonToWon(t.price),
      period: "month",
      description: `월 ${t.units}면 기준`,
    });
  }

  if (n.pricePerUnit != null && n.pricePerUnit > 0) {
    out.push({
      label: "개당 단가",
      price: manWonToWon(n.pricePerUnit),
      period: "month",
      description: `최소 ${Math.max(1, n.minUnits)}면`,
    });
  }

  if (n.pricePackage != null && n.pricePackage > 0 && tiers.length === 0) {
    out.push({
      label: "패키지",
      price: manWonToWon(n.pricePackage),
      period: "month",
    });
  }

  return out;
}

/** 네트워크 DB 행 → 일반 매체 상세(`MediaDetailPageView`)용 `MediaItem` */
export function networkRowToDetailMediaItem(
  n: MediaNetworkWithLocs,
): MediaItem {
  const base = prismaNetworkToMediaItem(n);
  const { pattern } = resolveTrafficPattern(null, "network", base.region);
  const priceOptions = buildPriceOptions(n);
  const typeLabel = NETWORK_TYPE_LABELS[n.type];

  return {
    ...base,
    priceOptions: priceOptions.length > 0 ? priceOptions : base.priceOptions,
    price:
      priceOptions[0]?.price ??
      base.price,
    trafficPattern: pattern,
    effectMemo: n.effectMemo ?? undefined,
    impressions:
      base.dailyFootTraffic > 0 ? base.dailyFootTraffic * 30 : undefined,
    reach: base.dailyFootTraffic > 0 ? base.dailyFootTraffic : undefined,
    features: n.features ?? n.description ?? base.features,
    featuresEn: n.features ?? n.description ?? base.featuresEn,
    catalogDescription: n.description ?? base.catalogDescription,
    longDescriptionKo: n.description ?? undefined,
    longDescriptionEn: n.description ?? undefined,
    size:
      n.totalLocations > 0
        ? `${n.totalLocations.toLocaleString("ko-KR")}개소`
        : undefined,
    nearbyFacilities: typeLabel
      ? `${typeLabel.ko} 네트워크 · 전국 ${n.totalLocations}개소`
      : undefined,
    instantBookingEnabled: false,
    availability: "available",
  };
}

export function networkDetailTypeLabel(
  type: string,
  isKo: boolean,
): string {
  const lb = NETWORK_TYPE_LABELS[type];
  if (!lb) return type;
  return isKo ? lb.ko : lb.en;
}
