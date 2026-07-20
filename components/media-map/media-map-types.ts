/** `/api/media/map` 항목 + 상세 패널용 확장 필드 */
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
  /** DB 대표가 — 지도 카드/핀 CPM SSOT */
  catalogPrice: number;
  catalogPricePeriod: string;
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
};
