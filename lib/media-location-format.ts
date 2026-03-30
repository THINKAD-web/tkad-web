import type { MediaItem } from "@/lib/media-data";

/** 시·도 접두어 제거 후 상세 번지·건물명 등 축약 (목록·카드용) */
const KO_PROVINCE_PREFIX =
  /^(서울특별시|서울|부산광역시|부산|대구광역시|대구|인천광역시|인천|광주광역시|광주|대전광역시|대전|울산광역시|울산|세종특별자치시|세종|경기도|경기|강원특별자치도|강원도|강원|충청북도|충북|충청남도|충남|전북특별자치도|전라북도|전북|전라남도|전남|경상북도|경북|경상남도|경남|제주특별자치도|제주)\s+/u;

export function formatLocationShortKo(raw: string): string {
  const input = raw.trim();
  if (!input) return "";
  let s = input.replace(KO_PROVINCE_PREFIX, "").trim();
  s = s.replace(
    /\s+[가-힣0-9A-Za-z]+(대로|로|길)\s+[\d\-]+.*$/u,
    "",
  );
  s = s.replace(/\s+\d+(-\d+)?(번지)?\s*$/u, "");
  s = s.replace(/\s+\d+(-\d+)?\s+[가-힣A-Za-z0-9가-힣\-]+$/u, "");
  const out = s.trim();
  return out || input;
}

export function formatLocationShortEn(raw: string): string {
  const input = raw.trim();
  if (!input) return "";
  let s = input.replace(/,\s*(South Korea|Republic of Korea)\s*$/i, "");
  s = s.replace(/\s+\d+(-\d+)?\s*$/u, "");
  return s.trim() || input;
}

export function formatMediaLocationShort(media: MediaItem, isKo: boolean): string {
  if (isKo) {
    return formatLocationShortKo(media.location);
  }
  const d = media.district?.trim();
  const c = media.city?.trim();
  if (d && c) return `${d}, ${c}`;
  if (d) return d;
  return formatLocationShortEn(media.locationEn || media.location);
}
