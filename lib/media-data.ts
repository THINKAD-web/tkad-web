import type { CampaignMapMediaType, CampaignMapPin } from "@/lib/campaign-monitoring-mock";
import { getDataDrivenSimilarMedia } from "@/lib/media-similar";
import {
  filterDisplayableMediaImageUrls,
  resolvePublicMediaImageUrl,
  getPreferredMediaImageUrl,
} from "@/lib/optimized-image-url";

export type MediaCaseStudyPhoto = {
  url: string;
  captionKo?: string;
  captionEn?: string;
};

/** 집행 단가 기준 (DB `price_period`) */
export type MediaPricePeriodKey =
  | "month"
  | "biweekly"
  | "week"
  | "day";

export type MediaPriceOption = {
  label: string;
  price: number;
  /** 개별 옵션 기간 (없으면 기본 `pricePeriod` 사용) */
  period?: MediaPricePeriodKey | string;
  /** 옵션 부가 설명 (집행 단위·노출 횟수 등) */
  description?: string;
};

/** `data/media-items-keyword-filter.json`에서 합성 상세에만 쓰는 메타 */
export type KeywordFilterDetailMeta = {
  specialFeature: string[];
  searchKeywords: string[];
  budgetMin: number;
  budgetMax: number;
  priceText: string;
  exposureTime: string[];
  duration: string[];
  status: string;
  regionLabels: string[];
  mediaLabels: string[];
  targetLabels: string[];
  industryLabels: string[];
};

export interface MediaItem {
  id: string;
  /** Canonical public URL segment (DB `slug`) */
  slug?: string;
  name: string;
  nameEn: string;
  location: string;
  locationEn: string;
  region: string;
  /** 서울 권역·수도권·지방 세부 (`lib/media-regions.ts`, DB `region_zone`) */
  regionZone?: string;
  /** 7일·30일 참여 지표 블렌드 (`lib/media-popularity.ts`) */
  popularityScore?: number;
  /** 홈·카드 추천 이유 (한 줄) */
  recommendReason?: string;
  /** 공개 카탈로그에서의 운영 상태 (DB `availability`) */
  availability?: "available" | "reserved" | "maintenance";
  /** 세부 카테고리 (DB `sub_category`) */
  subCategory?: string;
  /** 매체 카테고리 slug 배열 (DB `media_category`) */
  mediaCategory?: string[];
  /** 적합 캠페인 타겟 slug 배열 (DB `target_category`) */
  targetCategory?: string[];
  /** 검색·표시용 태그 */
  tags?: string[];
  city?: string;
  district?: string;
  /** 가까운 지하철역 요약 */
  nearbyStations?: string;
  /** 주변 랜드마크 요약 */
  nearbyLandmarks?: string;
  type: string;
  price: number;
  /** 집행 단가 기준: 월·2주·주·일 */
  pricePeriod?: MediaPricePeriodKey;
  lat: number;
  lng: number;
  dailyFootTraffic: number;
  /** 월간·기간 예상 노출(건). DB `impressions`와 동일 의미로 사용 */
  monthlyFootTraffic?: number;
  impressions?: number;
  /** 도달 인구(명) — DB `reach` */
  reach?: number;
  /** 평균 노출 빈도 — DB `frequency` */
  frequency?: number;
  /** CPM(원/1,000회) — DB `cpm` */
  cpm?: number;
  /** 참여율 0–1 — DB `engagement_rate` */
  engagementRate?: number;
  /** 가로·세로(m) — DB `width_m` / `height_m` */
  widthM?: number;
  heightM?: number;
  size?: string;
  resolution?: string;
  brightness?: string;
  targetAge?: string;
  /** 가시성 점수 0–100 (DB `visibility_score`) */
  visibilityScore?: number;
  /** 공개 카탈로그 Verified 리본 (DB `is_verified`, 관리자 지정) */
  isVerified?: boolean;
  features?: string;
  featuresEn?: string;
  dailyExposure?: string;
  sampleImages: string[];
  /** e.g. "06:00–24:00 (연중)" */
  operatingHours?: string;
  operatingHoursEn?: string;
  installYear?: number;
  /** 과거 집행 브랜드 등 (예: "삼성, LG, 현대") — DB는 집행 이력에서 집계 */
  advertiserHistory?: string;
  advertiserHistoryEn?: string;
  /** 주변 시설·역·랜드마크 요약 (예: "코엑스몰, 삼성역 2호선") */
  nearbyFacilities?: string;
  nearbyFacilitiesEn?: string;
  /** 진행·집행 사례 사진 (관리·콘텐츠용) */
  caseStudyPhotos?: MediaCaseStudyPhoto[];
  /** 복수 가격 옵션 (예: 15초 1일 1회 / 1일 2회 등) */
  priceOptions?: MediaPriceOption[];
  /** DB 단일 매체 | 합성 네트워크 패키지 */
  catalogSource?: "media" | "network";
  networkSubtype?: string;
  networkTotalLocations?: number;
  networkMinUnits?: number;
  networkPricePerUnit?: number | null;
  networkPricePackage?: number | null;
  networkPackageTiers?: { units: number; price: number }[];
  /** 네트워크 견적 시 지역 선택용 (한글 라벨) */
  networkRegionLabels?: string[];
  /** 키워드 필터 JSON 등 별도 카탈로그의 본문 (상세 탭 상단) */
  longDescriptionKo?: string;
  longDescriptionEn?: string;
  keywordFilter?: KeywordFilterDetailMeta;
  /** DB `description` 등 상세 본문 (longDescription 없을 때 매체 소개 폴백) */
  catalogDescription?: string;
  catalogDescriptionEn?: string;
  /** DB `description` 원문 — catalog·long이 비었을 때 매체 소개 최종 폴백 */
  description?: string;
  descriptionEn?: string;
  /** 시간대(24)·요일(7)·월(12) 유동인구 패턴 — DB `traffic_pattern`. nullable, 미입력 시 추정. */
  trafficPattern?: {
    hourly?: number[];
    weekly?: number[];
    monthly?: number[];
    updatedAt?: string;
  } | null;
  /** 등록일(ISO) — `신규 등록순` 정렬용. DB Media.createdAt. */
  createdAt?: string;
  /** 승인된 리뷰 평균 (1–5) */
  averageRating?: number;
  /** 승인된 리뷰 수 */
  reviewCount?: number;
  /** 신뢰 점수 1–100 */
  trustScore?: number;
  /** 신뢰·집행 뱃지 */
  trustBadges?: import("@/lib/media-trust").MediaTrustBadge[];
  /** 확정 Booking 기반 누적 집행 횟수 */
  executionCount?: number;
  /** 최근 집행으로부터 경과 개월 수 */
  lastExecutionMonthsAgo?: number | null;
  /** 성과 데이터 보증 배지 충족 */
  performanceGuaranteed?: boolean;
  /** 이동형(`mobile`) 서비스 구역 — 전국 시·군·구 행정코드(5자리). 공개 지도 폴리곤에 사용 */
  coverageDistrictCodes?: string[];
}

export function getMediaById(id: string | number): MediaItem | undefined {
  const key = String(id);
  return mediaData.find((m) => m.id === key);
}

export function getAllMediaIds(): string[] {
  return mediaData.map((m) => m.id);
}

/**
 * 두 좌표 사이 거리(km). lat/lng 누락 시 Number.POSITIVE_INFINITY.
 * 정렬용으로 충분한 정확도 (Earth radius 6371km 사용).
 */
export function haversineKm(
  a: { lat?: number | null; lng?: number | null },
  b: { lat?: number | null; lng?: number | null },
): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) {
    return Number.POSITIVE_INFINITY;
  }
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type SimilarSortKey = "score" | "distance" | "price" | "visibility";

/** Same region/type 우선, 가격대 유사도 보조 */
export function getSimilarMedia(item: MediaItem, limit = 4): MediaItem[] {
  return getSimilarMediaFromCatalog(mediaData, item, limit);
}

export function getSimilarMediaFromCatalog(
  catalog: MediaItem[],
  item: MediaItem,
  limit = 4,
  sortBy: SimilarSortKey = "score",
): MediaItem[] {
  const others = catalog.filter((m) => m.id !== item.id);
  if (sortBy === "distance") {
    const sameRegion = others.filter((m) => m.region === item.region);
    return sameRegion
      .map((m) => ({ m, d: haversineKm(item, m) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((x) => x.m);
  }
  if (sortBy === "price") {
    return others
      .slice()
      .sort((a, b) => Math.abs(a.price - item.price) - Math.abs(b.price - item.price))
      .slice(0, limit);
  }
  if (sortBy === "visibility") {
    return others
      .slice()
      .sort(
        (a, b) => (b.visibilityScore ?? 0) - (a.visibilityScore ?? 0),
      )
      .slice(0, limit);
  }
  return getDataDrivenSimilarMedia(catalog, item, limit);
}

/** 동일 URL이 `image` + `extractedImages` 등으로 중복될 때 한 번만 노출 */
export function dedupeImageUrls(urls: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const s = typeof u === "string" ? u.trim() : "";
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Gallery URLs: uses Cloudinary demo / Picsum when catalog has no uploads yet */
export function resolveMediaGallery(m: MediaItem): string[] {
  const fallback = [
    `https://picsum.photos/seed/tkad-m-${m.id}-1/1200/800`,
    `https://picsum.photos/seed/tkad-m-${m.id}-2/1200/800`,
    `https://picsum.photos/seed/tkad-m-${m.id}-3/1200/800`,
  ];
  const raw =
    m.sampleImages.length > 0 ? m.sampleImages : fallback;
  return dedupeImageUrls(raw);
}

/** 진행·집행 사례: 구조화된 사진 + 갤러리 추가 이미지(히어로 제외) 병합 */
export function buildCaseStudyGalleryItems(
  media: MediaItem,
): MediaCaseStudyPhoto[] {
  const structured = media.caseStudyPhotos ?? [];
  const seen = new Set(structured.map((p) => p.url));
  const gallery = dedupeImageUrls(resolveMediaGallery(media));
  const extras: MediaCaseStudyPhoto[] = [];
  for (let i = 1; i < gallery.length; i++) {
    const url = gallery[i];
    if (url?.trim() && !seen.has(url)) {
      seen.add(url);
      extras.push({ url });
    }
  }
  return [...structured, ...extras];
}

/**
 * DB `image` / `extractedImages` 등으로 채워진 `sampleImages` 중 첫 URL만 반환.
 * 없으면 null — 목업(Picsum) 대신 플레이스홀더 UI를 쓰려 할 때 사용.
 */
export function getPrimaryMediaImageUrl(m: MediaItem): string | null {
  const raw = getPreferredMediaImageUrl(dedupeImageUrls(m.sampleImages ?? []));
  return raw ? resolvePublicMediaImageUrl(raw) : null;
}

/** 상세·갤러리: Bunny CDN 업로드만 (Cloudinary 종료) */
export function getMediaDetailGalleryUrls(m: MediaItem): string[] {
  return filterDisplayableMediaImageUrls(dedupeImageUrls(m.sampleImages ?? []))
    .map((url) => resolvePublicMediaImageUrl(url))
    .filter((url): url is string => Boolean(url));
}

/**
 * 로케일별 매체 텍스트 선택 — EN 이 비어 있으면 KO 로 폴백.
 * 매체·상세·카탈로그·지도 등 모든 리스팅에서 일관되게 쓰도록 제공.
 */
export function mediaLocalizedText(
  ko: string | null | undefined,
  en: string | null | undefined,
  locale: string,
): string {
  const isKo = locale.toLowerCase().startsWith("ko");
  if (isKo) return (ko ?? "").trim() || (en ?? "").trim();
  return (en ?? "").trim() || (ko ?? "").trim();
}

export function mediaLocalizedName(
  m: Pick<MediaItem, "name" | "nameEn">,
  locale: string,
): string {
  return mediaLocalizedText(m.name, m.nameEn, locale);
}

export function mediaLocalizedLocation(
  m: Pick<MediaItem, "location" | "locationEn">,
  locale: string,
): string {
  return mediaLocalizedText(m.location, m.locationEn, locale);
}

export function latLngToFallbackPercent(lat: number, lng: number): { x: number; y: number } {
  const latMin = 33.2;
  const latMax = 38.6;
  const lngMin = 124.5;
  const lngMax = 132;
  const x = ((lng - lngMin) / (lngMax - lngMin)) * 100;
  const y = (1 - (lat - latMin) / (latMax - latMin)) * 100;
  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(94, Math.max(6, y)),
  };
}

/**
 * 동일·근접 좌표에 여러 핀이 있으면 카카오/구글에서 한 점으로만 보이거나 과확대되는 문제가 생김.
 * 표시용으로만 아주 작은 오프셋을 준다 (목록·상세의 주소 좌표는 그대로).
 */
function adjustOverlappingMapCoords(
  coords: { lat: number; lng: number }[],
): { lat: number; lng: number }[] {
  const out = coords.map((c) => ({ ...c }));
  const groups = new Map<string, number[]>();
  coords.forEach((c, i) => {
    const key = `${c.lat.toFixed(5)}_${c.lng.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(i);
  });
  const step = 0.00045;
  for (const idxs of groups.values()) {
    if (idxs.length < 2) continue;
    idxs.forEach((idx, i) => {
      if (i === 0) return;
      const ring = Math.floor((i - 1) / 8) + 1;
      const slot = (i - 1) % 8;
      const angle = (slot * Math.PI) / 4;
      out[idx] = {
        lat: coords[idx].lat + Math.sin(angle) * step * ring,
        lng: coords[idx].lng + Math.cos(angle) * step * ring,
      };
    });
  }
  return out;
}

function periodAbbrevKo(p?: MediaPricePeriodKey): string {
  switch (p ?? "month") {
    case "month":
      return "월";
    case "biweekly":
      return "2주";
    case "week":
      return "주";
    case "day":
      return "일";
    default:
      return "월";
  }
}

function periodAbbrevEn(p?: MediaPricePeriodKey): string {
  switch (p ?? "month") {
    case "month":
      return "mo";
    case "biweekly":
      return "2wk";
    case "week":
      return "wk";
    case "day":
      return "day";
    default:
      return "mo";
  }
}

function mediaTypeToMapType(type: string): CampaignMapMediaType {
  if (type === "static") return "billboard";
  if (type === "mobile") return "transport";
  if (type === "digital" || type === "network") return "digital";
  if (type === "billboard" || type === "highway") return "billboard";
  if (
    type === "premium" ||
    type === "indoor" ||
    type === "apartment"
  ) {
    return "digital";
  }
  if (type === "bus" || type === "subway") return "transport";
  return "digital";
}

export function mediaItemsToCampaignPins(
  items: readonly MediaItem[],
): CampaignMapPin[] {
  const gallery = (m: MediaItem) => resolveMediaGallery(m)[0] ?? "";
  const raw = items.map((m) => ({ lat: m.lat, lng: m.lng }));
  const adjusted = adjustOverlappingMapCoords(raw);
  return items.map((m, i) => {
    const lat = adjusted[i].lat;
    const lng = adjusted[i].lng;
    const { x, y } = latLngToFallbackPercent(lat, lng);
    const won = m.price;
    const capKo = `${m.location} · ${won.toLocaleString()}원/${periodAbbrevKo(m.pricePeriod)}`;
    const capEn = `${m.locationEn} · ₩${won.toLocaleString()}/${periodAbbrevEn(m.pricePeriod)}`;
    return {
      id: String(m.id),
      projectId: "media-browse",
      lat,
      lng,
      fallbackX: x,
      fallbackY: y,
      mediaType: mediaTypeToMapType(m.type),
      spotNameKo: m.name,
      spotNameEn: m.nameEn,
      creativeCaptionKo: capKo,
      creativeCaptionEn: capEn,
      imageUrl: gallery(m),
      impressionsToday: m.dailyFootTraffic,
      impressionsTotal:
        m.impressions ?? m.monthlyFootTraffic ?? m.dailyFootTraffic * 30,
      lastUpdatedIso: new Date().toISOString(),
    };
  });
}

const rawMediaCatalog: MediaItem[] = [
  {
    id: "1",
    name: "코엑스 K-POP 스퀘어",
    nameEn: "COEX K-POP Square LED Display",
    location: "서울 강남구 영동대로 513 코엑스",
    locationEn: "COEX, 513 Yeongdong-daero, Gangnam-gu, Seoul",
    region: "seoul",
    type: "digital",
    price: 5000,
    lat: 37.5112,
    lng: 127.0595,
    dailyFootTraffic: 450000,
    monthlyFootTraffic: 5000000,
    visibilityScore: 92,
    size: "80.9m × 20.1m (1,620㎡)",
    resolution: "7,840 × 1,952px",
    brightness: "9,000nit",
    targetAge: "20-40대, K-POP 팬, 관광객",
    features: "국내 최대 커브드 LED, 애너모픽 3D 가능, 농구장 4배 크기",
    featuresEn: "Korea's largest curved LED, anamorphic 3D capable, 4x basketball court size",
    dailyExposure: "450,000",
    operatingHours: "06:00–24:00 (연중)",
    operatingHoursEn: "6:00 a.m.–midnight (year-round)",
    installYear: 2021,
    advertiserHistory: "글로벌 IT·뷰티 브랜드 다수",
    advertiserHistoryEn: "Multiple global tech & beauty brands",
    nearbyFacilities: "코엑스몰, 현대백화점, 삼성역(2호선)",
    nearbyFacilitiesEn: "COEX Mall, Hyundai Dept. Store, Samsung Stn (Line 2)",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/sample.jpg",
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/docs/models",
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/dog.jpg",
    ],
    caseStudyPhotos: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/w_900,h_500,c_fill/sample.jpg",
        captionKo: "글로벌 IT 브랜드 런칭 — 야간 송출",
        captionEn: "Global IT brand launch — night broadcast",
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/w_900,h_500,c_fill/coffee.jpg",
        captionKo: "애너모픽 3D 특수 크리에이티브",
        captionEn: "Anamorphic 3D special creative",
      },
    ],
  },
  {
    id: "2",
    name: "강남대로 미디어폴 G-LIGHT",
    nameEn: "G-LIGHT Media Poles on Gangnam-daero",
    location: "강남역-신논현역 760m 구간",
    locationEn: "760m section between Gangnam Stn – Sinnonhyeon Stn",
    region: "seoul",
    type: "digital",
    price: 4000,
    pricePeriod: "week",
    lat: 37.4979,
    lng: 127.0276,
    dailyFootTraffic: 300000,
    monthlyFootTraffic: 9000000,
    visibilityScore: 78,
    size: "1.5m × 5.34m × 18기",
    resolution: "1,080 × 1,920px (기준)",
    brightness: "5,500nit",
    targetAge: "20-30대, 강남 직장인/소비자",
    features: "18기 동시 송출, 성별 인식 맞춤 광고",
    featuresEn: "18 poles simultaneous broadcast, gender-recognition targeted ads",
    dailyExposure: "300,000+",
    operatingHours: "05:30–01:00",
    operatingHoursEn: "5:30 a.m.–1:00 a.m.",
    installYear: 2022,
    advertiserHistory: "FMCG, 금융, 엔터",
    advertiserHistoryEn: "FMCG, finance, entertainment",
    nearbyFacilities: "강남역, 신논현역, 강남대로 상권",
    nearbyFacilitiesEn: "Gangnam & Sinnonhyeon stations, Gangnam-daero retail",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/coffee.jpg",
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/sheep.jpg",
    ],
    caseStudyPhotos: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/w_900,h_500,c_fill/sheep.jpg",
        captionKo: "미디어폴 18기 동시 송출 캠페인",
        captionEn: "18-pole simultaneous campaign",
      },
    ],
  },
  {
    id: "3",
    name: "신논현역 DSG빌딩 전광판",
    nameEn: "Sinnonhyeon Station DSG Building LED Display",
    location: "강남대로 신논현역 사거리",
    locationEn: "Sinnonhyeon Stn intersection, Gangnam-daero",
    region: "seoul",
    type: "digital",
    price: 2800,
    lat: 37.5044,
    lng: 127.0254,
    dailyFootTraffic: 250000,
    monthlyFootTraffic: 7500000,
    visibilityScore: 85,
    size: "약 200㎡ 면적",
    resolution: "4K 기반 송출",
    brightness: "7,000nit",
    targetAge: "강남 상권 소비자",
    features: "강남대로 초입 랜드마크, 높은 시인성",
    featuresEn: "Gangnam-daero entrance landmark, high visibility",
    dailyExposure: "250,000",
    operatingHours: "06:00–24:00",
    operatingHoursEn: "6:00 a.m.–midnight",
    installYear: 2020,
    advertiserHistory: "자동차, 통신",
    advertiserHistoryEn: "Automotive, telecom",
    nearbyFacilities: "신논현역(9·신분당), 강남대로",
    nearbyFacilitiesEn: "Sinnonhyeon Stn (9/Shinbundang), Gangnam-daero",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/docs/models",
    ],
  },
  {
    id: "4",
    name: "청담동 학동사거리 SS타워 전광판",
    nameEn: "Cheongdam SS Tower LED Display",
    location: "서울 강남구 학동사거리",
    locationEn: "Hakdong intersection, Gangnam-gu, Seoul",
    region: "seoul",
    type: "digital",
    price: 3200,
    lat: 37.5169,
    lng: 127.0397,
    dailyFootTraffic: 200000,
    monthlyFootTraffic: 6000000,
    visibilityScore: 88,
    size: "대형 루프 전광",
    resolution: "6K급 패널",
    brightness: "8,000nit",
    targetAge: "청담동 프리미엄 소비자",
    features: "국내 최장 가시거리, 청담 프리미엄 상권",
    featuresEn: "Longest viewing distance in Korea, Cheongdam premium district",
    dailyExposure: "200,000",
    operatingHours: "06:00–24:00",
    operatingHoursEn: "6:00 a.m.–midnight",
    installYear: 2019,
    advertiserHistory: "럭셔리, 주류",
    advertiserHistoryEn: "Luxury, beverage",
    nearbyFacilities: "압구정로데오, 학동사거리",
    nearbyFacilitiesEn: "Apgujeong Rodeo, Hakdong junction",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/sample.jpg",
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/coffee.jpg",
    ],
  },
  {
    id: "5",
    name: "성수동 반도 외벽광고",
    nameEn: "Seongsu Bando Building Exterior Advertisement",
    location: "서울 성동구 성수동2가",
    locationEn: "Seongsu-dong 2-ga, Seongdong-gu, Seoul",
    region: "seoul",
    type: "static",
    price: 2000,
    lat: 37.5445,
    lng: 127.056,
    dailyFootTraffic: 180000,
    monthlyFootTraffic: 5400000,
    visibilityScore: 72,
    size: "대형 외벽 패널",
    resolution: "인쇄 + 야간 조명",
    brightness: "역광 조명",
    targetAge: "MZ세대, 성수 트렌드세터",
    features: "중앙감속기·피치스도원 인근, 성수 핫플레이스",
    featuresEn: "Near Junggang Gamsoek-gi & Peaches Do-won, Seongsu hotspot",
    dailyExposure: "180,000",
    operatingHours: "상시 노출 (야간 조명)",
    operatingHoursEn: "Always visible (night lighting)",
    installYear: 2018,
    advertiserHistory: "패션, 크리에이티브 브랜드",
    advertiserHistoryEn: "Fashion, creative brands",
    nearbyFacilities: "성수역, 카페·쇼룸 밀집",
    nearbyFacilitiesEn: "Seongsu Stn, cafes & showrooms",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/sheep.jpg",
    ],
    caseStudyPhotos: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/w_900,h_500,c_fill/dog.jpg",
        captionKo: "패션 브랜드 시즌 캠페인 — 외벽 패널",
        captionEn: "Fashion season campaign — exterior panel",
      },
    ],
  },
  {
    id: "6",
    name: "지하철 2호선 성수역 디지털광고",
    nameEn: "Line 2 Seongsu Station Digital Advertisement",
    location: "서울 성동구 성수역",
    locationEn: "Seongsu Station, Seoul",
    region: "seoul",
    type: "mobile",
    price: 1500,
    lat: 37.5445,
    lng: 127.0559,
    dailyFootTraffic: 100000,
    monthlyFootTraffic: 3000000,
    visibilityScore: 64,
    size: "역사 내 DID 멀티 스크린",
    resolution: "FHD~4K 혼합",
    brightness: "실내 기준 500–800nit",
    targetAge: "2호선 이용객, MZ세대",
    features: "2호선 유동인구 상위역, 디지털 스크린",
    featuresEn: "Top-traffic Line 2 station, digital screens",
    dailyExposure: "100,000+",
    operatingHours: "첫차–막차 (역 운영 시간)",
    operatingHoursEn: "First–last train (station hours)",
    installYear: 2023,
    advertiserHistory: "앱·게임, 뷰티",
    advertiserHistoryEn: "Apps, games, beauty",
    nearbyFacilities: "2호선 성수역, 성수연무장길",
    nearbyFacilitiesEn: "Line 2 Seongsu Stn, Seongsu cafe street",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/dog.jpg",
    ],
  },
  {
    id: "10",
    name: "코엑스 파르나스 미디어타워",
    nameEn: "COEX Parnas Media Tower Digital Display",
    location: "삼성역 코엑스",
    locationEn: "COEX, Samsung Station, Seoul",
    region: "seoul",
    type: "digital",
    price: 3500,
    lat: 37.5085,
    lng: 127.0635,
    dailyFootTraffic: 300000,
    monthlyFootTraffic: 9000000,
    visibilityScore: 86,
    size: "타워형 세로 LED",
    resolution: "세로형 고해상도",
    brightness: "6,500nit",
    targetAge: "비즈니스·MICE 참가자, 강남 소비자",
    features: "고급스러운 조형미, 삼성역 랜드마크",
    featuresEn: "Elegant sculptural design, Samsung Station landmark",
    dailyExposure: "300,000",
    operatingHours: "06:00–24:00",
    operatingHoursEn: "6:00 a.m.–midnight",
    installYear: 2020,
    advertiserHistory: "B2B, 프리미엄 소비재",
    advertiserHistoryEn: "B2B, premium consumer goods",
    nearbyFacilities: "파르나스몰, 삼성역",
    nearbyFacilitiesEn: "Parnas Mall, Samsung Stn",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/sample.jpg",
    ],
    caseStudyPhotos: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/w_900,h_500,c_fill/docs/models",
        captionKo: "B2B 글로벌 컨퍼런스 연계 노출",
        captionEn: "B2B global conference tie-in exposure",
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/w_900,h_500,c_fill/coffee.jpg",
        captionKo: "삼성역 코엑스권 프리미엄 집행 사례",
        captionEn: "Premium placement near Samsung / COEX",
      },
    ],
  },
  {
    id: "7",
    name: "서면역 디지털 스크린",
    nameEn: "Seomyeon Station Digital Display",
    location: "부산 부산진구",
    locationEn: "Busanjin-gu, Busan",
    region: "busan",
    type: "digital",
    price: 1500,
    lat: 35.1579,
    lng: 129.0593,
    dailyFootTraffic: 140000,
    monthlyFootTraffic: 4200000,
    visibilityScore: 70,
    dailyExposure: "140,000",
    operatingHours: "06:00–24:00",
    operatingHoursEn: "6:00 a.m.–midnight",
    installYear: 2021,
    advertiserHistory: "지역 리테일, 관광",
    advertiserHistoryEn: "Local retail, tourism",
    nearbyFacilities: "서면역, 서면 상권",
    nearbyFacilitiesEn: "Seomyeon Stn, Seomyeon retail zone",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/coffee.jpg",
    ],
  },
  {
    id: "8",
    name: "부산역 지하철 광고",
    nameEn: "Busan KTX Station Subway Advertisement",
    location: "부산 동구",
    locationEn: "Dong-gu, Busan",
    region: "busan",
    type: "mobile",
    price: 900,
    lat: 35.115,
    lng: 129.041,
    dailyFootTraffic: 85000,
    monthlyFootTraffic: 2550000,
    visibilityScore: 62,
    dailyExposure: "85,000",
    operatingHours: "첫차–막차",
    operatingHoursEn: "First–last train",
    installYear: 2022,
    advertiserHistory: "관광·숙박",
    advertiserHistoryEn: "Tourism, hospitality",
    nearbyFacilities: "KTX 부산역, 차이나타운 인근",
    nearbyFacilitiesEn: "Busan KTX station, Chinatown area",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/docs/models",
    ],
  },
  {
    id: "9",
    name: "제주공항 디지털 광고",
    nameEn: "Jeju International Airport Digital Advertisement",
    location: "제주시",
    locationEn: "Jeju City",
    region: "jeju",
    type: "digital",
    price: 2200,
    lat: 33.506,
    lng: 126.493,
    dailyFootTraffic: 110000,
    monthlyFootTraffic: 3300000,
    visibilityScore: 74,
    dailyExposure: "110,000",
    operatingHours: "항공편 운항 시간 연동",
    operatingHoursEn: "Aligned with flight operations",
    installYear: 2021,
    advertiserHistory: "항공, 면세, 여행",
    advertiserHistoryEn: "Airlines, duty-free, travel",
    nearbyFacilities: "제주국제공항 터미널",
    nearbyFacilitiesEn: "Jeju International Airport terminal",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/sheep.jpg",
    ],
  },
  {
    id: "11",
    name: "중문관광단지 입구 빌보드",
    nameEn: "Jungmun Tourist District Entrance Billboard",
    location: "서귀포시",
    locationEn: "Seogwipo",
    region: "jeju",
    type: "static",
    price: 1000,
    lat: 33.252,
    lng: 126.412,
    dailyFootTraffic: 65000,
    monthlyFootTraffic: 1950000,
    visibilityScore: 68,
    dailyExposure: "65,000",
    operatingHours: "상시 (야간 조명)",
    operatingHoursEn: "Always on (night lighting)",
    installYear: 2017,
    advertiserHistory: "관광·렌터카",
    advertiserHistoryEn: "Tourism, rental cars",
    nearbyFacilities: "중문관광단지, 호텔가",
    nearbyFacilitiesEn: "Jungmun resort, hotel zone",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/dog.jpg",
    ],
  },
  {
    id: "12",
    name: "전국 시내버스 루프",
    nameEn: "Nationwide City Bus Interior Advertising",
    location: "전국 주요 도시",
    locationEn: "Major cities nationwide",
    region: "national",
    type: "mobile",
    price: 600,
    lat: 36.5,
    lng: 127.9,
    dailyFootTraffic: 350000,
    monthlyFootTraffic: 10500000,
    visibilityScore: 66,
    dailyExposure: "350,000+",
    operatingHours: "노선 운행 시간",
    operatingHoursEn: "Per route schedule",
    installYear: 2019,
    advertiserHistory: "FMCG, 공공 캠페인",
    advertiserHistoryEn: "FMCG, public campaigns",
    nearbyFacilities: "주요 시내노선·정류장",
    nearbyFacilitiesEn: "Major city routes & stops",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/sample.jpg",
    ],
  },
  {
    id: "13",
    name: "전국 고속도로 빌보드 패키지",
    nameEn: "National Highway Billboard Package",
    location: "전국 고속도로",
    locationEn: "Nationwide expressways",
    region: "national",
    type: "static",
    price: 3500,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 220000,
    monthlyFootTraffic: 6600000,
    visibilityScore: 80,
    dailyExposure: "220,000",
    operatingHours: "상시 노출",
    operatingHoursEn: "Always visible",
    installYear: 2016,
    advertiserHistory: "자동차, 정유",
    advertiserHistoryEn: "Automotive, energy",
    nearbyFacilities: "주요 IC·휴게소 인접 지점",
    nearbyFacilitiesEn: "Near major ICs & rest areas",
    sampleImages: [
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_675,c_fill/coffee.jpg",
    ],
  },
];

function enrichMediaCatalogItem(m: MediaItem): MediaItem {
  const idHash = m.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const imp = m.impressions ?? m.monthlyFootTraffic;
  const daily = m.dailyFootTraffic ?? 0;
  const impressions =
    imp ?? (daily > 0 ? Math.round(daily * 30) : undefined);
  const reach =
    m.reach ??
    (typeof impressions === "number" && impressions > 0
      ? Math.round(impressions * (0.32 + (idHash % 45) / 100))
      : undefined);
  const frequency = m.frequency ?? 2.2 + (idHash % 18) / 5;
  const engagementRate =
    m.engagementRate ?? 0.008 + (idHash % 25) / 1000;
  const tags =
    m.tags ??
    [
      m.type === "digital"
        ? "디지털"
        : m.type === "static"
          ? "고정"
          : "이동",
      m.region === "seoul"
        ? "서울"
        : m.region === "busan"
          ? "부산"
          : m.region === "jeju"
            ? "제주"
            : "전국",
    ];
  const subCategory =
    m.subCategory ??
    (m.type === "digital"
      ? "디지털 전광"
      : m.type === "static"
        ? "빌보드·외벽"
        : "교통·역사 매체");
  const nearbyStations =
    m.nearbyStations ??
    (() => {
      const f = m.nearbyFacilities ?? "";
      const station = f.match(/([가-힣A-Za-z0-9]+역)(?=\(|,|$|\s)/);
      return station ? station[1] : undefined;
    })();
  return {
    ...m,
    impressions,
    monthlyFootTraffic: m.monthlyFootTraffic ?? impressions,
    reach,
    frequency,
    engagementRate,
    tags,
    subCategory,
    nearbyStations,
  };
}

export const mediaData: MediaItem[] = rawMediaCatalog.map(enrichMediaCatalogItem);

export const typeLabels: Record<string, { ko: string; en: string }> = {
  digital: { ko: "DOOH", en: "DOOH" },
  static: { ko: "고정형", en: "Static" },
  fixed: { ko: "고정형", en: "Static" },
  mobile: { ko: "이동형", en: "Mobile" },
  network: { ko: "네트워크/패키지", en: "Network / package" },
};

/** 텍스트 검색: 매체명·주소·구/시·역·시설·랜드마크·태그·세부 카테고리·유형 라벨 */
function normalizeRegionCode(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "전국";
  if (s === "seoul") return "서울";
  if (s === "busan") return "부산";
  if (s === "jeju") return "제주";
  if (s === "national") return "전국";
  if (s === "gwangju") return "광주";
  if (s === "gyeonggi" || s === "gyeonggi-do") return "경기";
  if (s === "incheon") return "인천";
  return s;
}

function toChosung(input: string): string {
  const CHO = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];
  let out = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const idx = Math.floor((code - 0xac00) / (21 * 28));
      out += CHO[idx] ?? ch;
    } else if (CHO.includes(ch)) {
      out += ch;
    }
  }
  return out;
}

const SYNONYM_MAP: Record<string, string[]> = {
  디지털전광판: ["디지털 전광판", "디지털", "전광판", "led", "lcd", "digital", "signage", "사이니지", "디지털사이니지"],
  옥외빌보드: ["옥외 빌보드", "빌보드", "outdoor", "옥외광고"],
  지하철매체: ["지하철 매체", "지하철", "subway", "metro", "스크린도어"],
  버스쉘터: ["버스·쉘터", "버스쉘터", "버스", "shelter", "bus shelter"],
  랩핑키워드: ["랩핑", "래핑", "아트래핑", "wrapping", "브랜드 랩핑", "건물 랩핑"],
  mz키워드: ["mz", "mz세대", "z세대", "밀레니얼", "millennial", "gen z", "genz"],
  kpop키워드: ["k-pop", "kpop", "케이팝", "k-pop", "팬덤", "팬 응원", "응원광고", "아이돌"],
  핫플키워드: ["핫플", "핫플레이스", "핫 플레이스", "hot place", "번화가", "핫플 광고"],
  강남권: ["강남", "gangnam", "테헤란", "역삼", "논현", "신논현", "청담"],
  성수권: ["성수", "seongsu", "성동", "연무장", "성수동"],
  홍대권: ["홍대", "hongdae", "홍익", "합정", "마포", "상수"],
  코엑스권: ["코엑스", "coex", "삼성", "삼성동", "무역센터"],
};

/** 단어 하나에 동의어·관련어 확장 (복합 검색의 각 토큰용) */
function expandTokensForWord(word: string): string[] {
  const base = word.toLowerCase().trim();
  if (!base) return [];
  const out = new Set<string>([base]);
  for (const [key, vals] of Object.entries(SYNONYM_MAP)) {
    const keyL = key.toLowerCase();
    let hit = base === keyL;
    for (const v of vals) {
      const vl = v.toLowerCase();
      if (base === vl) hit = true;
      if (vl.length >= 2 && base.includes(vl)) hit = true;
      if (base.length >= 2 && vl.includes(base)) hit = true;
    }
    if (hit) {
      out.add(keyL);
      for (const v of vals) out.add(v.toLowerCase());
    }
  }
  return [...out];
}

function tokenMatchesHaystack(
  token: string,
  haystackPlain: string,
  tagsText: string,
  haystackChosung: string,
): boolean {
  if (haystackPlain.includes(token)) return true;
  if (tagsText.includes(token)) return true;
  if (/^[ㄱ-ㅎ]+$/.test(token)) {
    if (toChosung(haystackPlain).includes(token)) return true;
    if (haystackChosung.includes(token)) return true;
  }
  return false;
}

function wordMatchesHaystack(
  word: string,
  haystackPlain: string,
  tagsText: string,
  haystackChosung: string,
): boolean {
  return expandTokensForWord(word).some((t) =>
    tokenMatchesHaystack(t, haystackPlain, tagsText, haystackChosung),
  );
}

export function matchesMediaTextQuery(m: MediaItem, lower: string): boolean {
  const fields: (string | null | undefined)[] = [
    m.name,
    m.nameEn,
    m.location,
    m.locationEn,
    m.longDescriptionKo,
    m.longDescriptionEn,
    m.catalogDescription,
    m.catalogDescriptionEn,
    m.description,
    m.descriptionEn,
    m.district,
    m.city,
    m.subCategory,
    m.nearbyStations,
    m.nearbyFacilities,
    m.nearbyFacilitiesEn,
    m.nearbyLandmarks,
    m.features,
    m.featuresEn,
    m.targetAge,
    m.networkSubtype,
    typeLabels[m.type]?.ko,
    typeLabels[m.type]?.en,
    normalizeRegionCode(m.region),
  ];
  const kf = m.keywordFilter;
  if (kf) {
    fields.push(
      ...kf.searchKeywords,
      ...kf.regionLabels,
      ...kf.mediaLabels,
      ...kf.targetLabels,
      ...kf.industryLabels,
      kf.priceText,
    );
  }

  const haystackPlain = fields
    .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
    .join(" ")
    .toLowerCase();

  const haystackChosung = toChosung(
    fields
      .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      .join(" "),
  );

  const tagsText = (m.tags ?? []).join(" ").toLowerCase();

  const trimmed = lower.trim().toLowerCase();
  if (!trimmed) return true;

  const fullHay = `${haystackPlain} ${tagsText}`;
  if (fullHay.includes(trimmed)) return true;

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 1) {
    return wordMatchesHaystack(words[0] ?? trimmed, haystackPlain, tagsText, haystackChosung);
  }

  return words.every((w) =>
    wordMatchesHaystack(w, haystackPlain, tagsText, haystackChosung),
  );
}
