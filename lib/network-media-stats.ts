export type NetworkDurationKey = "week" | "month" | "quarter" | "year";

export const NETWORK_DURATION_OPTIONS: {
  key: NetworkDurationKey;
  factor: number;
  labelKo: string;
  labelEn: string;
}[] = [
  { key: "week", factor: 0.3, labelKo: "1주", labelEn: "1 week" },
  { key: "month", factor: 1, labelKo: "1개월", labelEn: "1 month" },
  { key: "quarter", factor: 2.7, labelKo: "3개월", labelEn: "3 months" },
  { key: "year", factor: 8.4, labelKo: "1년", labelEn: "1 year" },
];

export const DEFAULT_NETWORK_UNIT_PRICE_MAN = 5;

export const NETWORK_REGION_META: Record<
  string,
  { labelKo: string; labelEn: string; order: number }
> = {
  seoul: { labelKo: "서울", labelEn: "Seoul", order: 0 },
  gyeonggi: { labelKo: "경기", labelEn: "Gyeonggi", order: 1 },
  incheon: { labelKo: "인천", labelEn: "Incheon", order: 2 },
  busan: { labelKo: "부산", labelEn: "Busan", order: 3 },
  daegu: { labelKo: "대구", labelEn: "Daegu", order: 4 },
  daejeon: { labelKo: "대전", labelEn: "Daejeon", order: 5 },
  gwangju: { labelKo: "광주", labelEn: "Gwangju", order: 6 },
  jeju: { labelKo: "제주", labelEn: "Jeju", order: 7 },
  other: { labelKo: "기타", labelEn: "Other", order: 8 },
};

export type NetworkRegionStat = {
  key: string;
  labelKo: string;
  labelEn: string;
  locationCount: number;
  unitCount: number;
  avgPriceManWon: number;
  availableUnits: number;
};

export type NetworkMapPoint = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  regionKey: string;
  regionLabelKo: string;
  unitCount: number;
  priceManWon: number;
  networkName: string;
};

export type NetworkFeaturedItem = {
  id: string;
  name: string;
  nameEn: string | null;
  image: string | null;
  pricePerUnit: number;
  totalLocations: number;
  minUnits: number;
  type: string;
};

export type NetworkMediaStats = {
  regions: NetworkRegionStat[];
  mapPoints: NetworkMapPoint[];
  nationalAvgPriceManWon: number;
  totalLocations: number;
  totalUnits: number;
  networkCount: number;
  heroImage: string | null;
  galleryImages: string[];
  featuredNetworks: NetworkFeaturedItem[];
  minUnitsTypical: number;
};

export function normalizeNetworkRegionKey(
  regionMain: string | null,
  regionSub: string | null,
): string {
  const hay = `${regionMain ?? ""} ${regionSub ?? ""}`;
  if (
    /부산|busan|해운대|광안리|서면|센텀|남포|금정구|연제구|수영구|부산진구|해운대구|동래구|사하구|사상구/i.test(
      hay,
    )
  ) {
    return "busan";
  }
  if (/서울/.test(hay)) return "seoul";
  if (/경기/.test(hay)) return "gyeonggi";
  if (/인천/.test(hay)) return "incheon";
  if (/(?:^|[^가-힣])대구|대구광역시|daegu/i.test(hay)) return "daegu";
  if (/대전|daejeon/i.test(hay)) return "daejeon";
  if (/광주|gwangju/i.test(hay)) return "gwangju";
  if (/제주/.test(hay)) return "jeju";
  return "other";
}

export function networkDurationFactor(key: NetworkDurationKey): number {
  return (
    NETWORK_DURATION_OPTIONS.find((o) => o.key === key)?.factor ?? 1
  );
}

/** 총가격(만원) = 지점수 × 월 단가(만원) × 기간계수 */
export function calculateNetworkPrice(
  points: number,
  unitPriceManWon: number,
  duration: NetworkDurationKey,
): number {
  const p = Math.max(1, Math.min(100, Math.round(points) || 1));
  const price = Math.max(1, unitPriceManWon);
  return Math.round(p * price * networkDurationFactor(duration));
}

/** 만원 → 원 표시용 */
export function formatNetworkPriceWon(manWon: number, isKo: boolean): string {
  const won = manWon * 10_000;
  if (isKo) {
    if (won >= 100_000_000) {
      return `₩${(won / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
    }
    return `₩${won.toLocaleString("ko-KR")}`;
  }
  if (won >= 1_000_000) {
    return `₩${(won / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  return `₩${won.toLocaleString("en-US")}`;
}
