import type { MediaItem } from "@/lib/media-data";

/** 챗봇 컨텍스트용 경량 매체 스냅샷 */
export type ChatbotCatalogEntry = {
  id: string;
  name: string;
  nameEn: string;
  location: string;
  locationEn: string;
  region: string;
  type: string;
  /** 월 단가, 단위: 만원 (VAT 별도일 수 있음) */
  price: number;
  city?: string;
  district?: string;
  nearbyStations?: string;
  nearbyLandmarks?: string;
  nearbyFacilities?: string;
  tags?: string[];
  subCategory?: string;
};

const MAX_ITEMS = 90;
const MAX_JSON_CHARS = 48_000;

export function mediaItemsToChatbotCatalog(
  items: MediaItem[],
): ChatbotCatalogEntry[] {
  return items.slice(0, MAX_ITEMS).map((m) => ({
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    location: m.location,
    locationEn: m.locationEn,
    region: m.region,
    type: m.type,
    price: m.price,
    city: m.city,
    district: m.district,
    nearbyStations: m.nearbyStations,
    nearbyLandmarks: m.nearbyLandmarks,
    nearbyFacilities: m.nearbyFacilities,
    tags: m.tags,
    subCategory: m.subCategory,
  }));
}

export function catalogJsonForPrompt(items: MediaItem[]): string {
  let rows = mediaItemsToChatbotCatalog(items);
  let json = JSON.stringify(rows);
  while (json.length > MAX_JSON_CHARS && rows.length > 15) {
    rows = rows.slice(0, -1);
    json = JSON.stringify(rows);
  }
  return json;
}
