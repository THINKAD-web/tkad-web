import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import {
  prismaNetworkToMediaItem,
  type MediaNetworkWithLocs,
} from "@/lib/media-network-public";
import {
  NETWORK_TYPE_LABELS,
  loosePackagePrices,
  parsePackageOptions,
} from "@/lib/media-network-types";
import { resolveTrafficPattern } from "@/lib/media-traffic-estimate";

/** 가격은 DB·코드 전반에서 원 단위로 통일됨(과거 ×10,000 변환 제거). */
function priceWon(won: number): number {
  return Math.round(won);
}

function buildPriceOptions(n: MediaNetworkWithLocs): MediaPriceOption[] {
  const tiers = parsePackageOptions(n.packageOptions);
  const out: MediaPriceOption[] = [];

  // 패키지 우선: priceOptions[0] 이 헤드라인가가 되므로 패키지를 먼저 넣는다.
  if (tiers.length > 0) {
    for (const t of tiers) {
      out.push({
        label: `${t.units.toLocaleString("ko-KR")}면 패키지`,
        price: priceWon(t.price),
        period: "month",
        description: `월 ${t.units}면 기준`,
      });
    }
  } else {
    // units 없는 packageOptions 도 가격으로 노출(헤드라인이 pricePerUnit 으로 떨어지지 않게)
    const loose = loosePackagePrices(n.packageOptions);
    loose.forEach((price, i) => {
      out.push({
        label: loose.length > 1 ? `패키지 ${i + 1}` : "패키지",
        price: priceWon(price),
        period: "month",
      });
    });
    if (n.pricePackage != null && n.pricePackage > 0) {
      out.push({ label: "패키지", price: priceWon(n.pricePackage), period: "month" });
    }
  }

  // 개당 단가는 항상 마지막 — 패키지가 있으면 헤드라인을 차지하지 않는다.
  if (n.pricePerUnit != null && n.pricePerUnit > 0) {
    out.push({
      label: "개당 단가",
      price: priceWon(n.pricePerUnit),
      period: "month",
      description: `최소 ${Math.max(1, n.minUnits)}면`,
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
