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
  price: number;
  pricePeriod: string;
  createdAt: string | null;
  lat: number;
  lng: number;
  image: string | null;
  availability: string | null;
  visibilityScore: number;
  dailyFootTraffic?: number | null;
  impressions?: number | null;
  cpm?: number | null;
};
