/** `/api/media/map` 항목 + 상세 패널용 확장 필드 */
export type MapDisplayMode = "pin" | "service_region" | "location_unknown";

export type MapMapItem = {
  id: string;
  name: string;
  location: string;
  region: string;
  city: string | null;
  district: string | null;
  type: string;
  subCategory: string | null;
  /** 목록 표시가 — 최저 옵션 포함 */
  price: number;
  pricePeriod: string;
  /** CPM SSOT — `resolveMediaDisplayPrice` / 다구좌 옵션 */
  priceOptions?: Array<{
    price: number;
    period: string;
    label?: string;
  }>;
  /** DB 대표가 — 지도 카드/핀 CPM SSOT */
  catalogPrice: number;
  catalogPricePeriod: string;
  /** 목록·홈과 동일 — CPM 분자 SSOT */
  productPriceWon?: number | null;
  productPriceDays?: number | null;
  engineDailyImpressions?: number | null;
  impressionModelVersion?: string | null;
  monthlyFootTraffic?: number | null;
  createdAt: string | null;
  lat: number;
  lng: number;
  image: string | null;
  availability: string | null;
  visibilityScore: number;
  dailyFootTraffic?: number | null;
  impressions?: number | null;
  cpm?: number | null;
  isVerified?: boolean;
  isInstantBooking?: boolean;
  installLocations?: Array<{ label: string; lat: number; lng: number }>;
  /** 지도 표시 분류 — pin | service_region | location_unknown */
  mapDisplayMode?: MapDisplayMode;
  /** service_region 배지 라벨 */
  serviceRegionLabel?: string | null;
  /** 이동형 coverage 필터용 (클라이언트) */
  coverageDistrictCodes?: string[];
  /** @deprecated `mapDisplayMode` 사용 */
  locationUnknown?: boolean;
};
