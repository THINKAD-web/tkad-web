import type { CampaignMapMediaType, CampaignMapPin } from "@/lib/campaign-monitoring-mock";

export type MediaCaseStudyPhoto = {
  url: string;
  captionKo?: string;
  captionEn?: string;
};

export interface MediaItem {
  id: string;
  name: string;
  nameEn: string;
  location: string;
  locationEn: string;
  region: string;
  type: string;
  price: number;
  lat: number;
  lng: number;
  dailyFootTraffic: number;
  monthlyFootTraffic?: number;
  size?: string;
  resolution?: string;
  brightness?: string;
  targetAge?: string;
  features?: string;
  featuresEn?: string;
  dailyExposure?: string;
  sampleImages: string[];
  /** e.g. "06:00–24:00 (연중)" */
  operatingHours?: string;
  operatingHoursEn?: string;
  installYear?: number;
  advertiserHistory?: string;
  advertiserHistoryEn?: string;
  nearbyFacilities?: string;
  nearbyFacilitiesEn?: string;
  /** 진행·집행 사례 사진 (관리·콘텐츠용) */
  caseStudyPhotos?: MediaCaseStudyPhoto[];
}

export function getMediaById(id: string | number): MediaItem | undefined {
  const key = String(id);
  return mediaData.find((m) => m.id === key);
}

export function getAllMediaIds(): string[] {
  return mediaData.map((m) => m.id);
}

function scoreSimilarPair(item: MediaItem, m: MediaItem): number {
  let s = 0;
  if (m.region === item.region) s += 4;
  if (m.type === item.type) s += 3;
  const pr = Math.abs(m.price - item.price) / Math.max(item.price, 1);
  if (pr < 0.25) s += 2;
  else if (pr < 0.5) s += 1;
  return s;
}

/** Same region/type 우선, 가격대 유사도 보조 */
export function getSimilarMedia(item: MediaItem, limit = 4): MediaItem[] {
  return getSimilarMediaFromCatalog(mediaData, item, limit);
}

export function getSimilarMediaFromCatalog(
  catalog: MediaItem[],
  item: MediaItem,
  limit = 4,
): MediaItem[] {
  const others = catalog.filter((m) => m.id !== item.id);
  const scored = others.map((m) => ({ m, s: scoreSimilarPair(item, m) }));
  scored.sort(
    (a, b) =>
      b.s - a.s ||
      Math.abs(a.m.price - item.price) - Math.abs(b.m.price - item.price),
  );
  return scored.slice(0, limit).map((x) => x.m);
}

/** Gallery URLs: uses Cloudinary demo / Picsum when catalog has no uploads yet */
export function resolveMediaGallery(m: MediaItem): string[] {
  if (m.sampleImages.length > 0) return m.sampleImages;
  return [
    `https://picsum.photos/seed/tkad-m-${m.id}-1/1200/800`,
    `https://picsum.photos/seed/tkad-m-${m.id}-2/1200/800`,
    `https://picsum.photos/seed/tkad-m-${m.id}-3/1200/800`,
  ];
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

function mediaTypeToMapType(type: string): CampaignMapMediaType {
  if (type === "billboard") return "billboard";
  if (type === "digital") return "digital";
  return "transport";
}

export function mediaItemsToCampaignPins(
  items: readonly MediaItem[],
  isKo: boolean,
): CampaignMapPin[] {
  const gallery = (m: MediaItem) => resolveMediaGallery(m)[0] ?? "";
  return items.map((m) => {
    const { x, y } = latLngToFallbackPercent(m.lat, m.lng);
    const capKo = `${m.location} · 월 ₩${m.price.toLocaleString()}만`;
    const capEn = `${m.locationEn} · ₩${m.price.toLocaleString()}M/mo`;
    return {
      id: String(m.id),
      projectId: "media-browse",
      lat: m.lat,
      lng: m.lng,
      fallbackX: x,
      fallbackY: y,
      mediaType: mediaTypeToMapType(m.type),
      spotNameKo: m.name,
      spotNameEn: m.nameEn,
      creativeCaptionKo: capKo,
      creativeCaptionEn: capEn,
      imageUrl: gallery(m),
      impressionsToday: m.dailyFootTraffic,
      impressionsTotal: m.monthlyFootTraffic ?? m.dailyFootTraffic * 30,
      lastUpdatedIso: new Date().toISOString(),
    };
  });
}

export const mediaData: MediaItem[] = [
  {
    id: "1",
    name: "코엑스 K-POP 스퀘어",
    nameEn: "COEX K-POP Square LED",
    location: "서울 강남구 영동대로 513 코엑스",
    locationEn: "COEX, 513 Yeongdong-daero, Gangnam-gu, Seoul",
    region: "seoul",
    type: "digital",
    price: 5000,
    lat: 37.5112,
    lng: 127.0595,
    dailyFootTraffic: 450000,
    monthlyFootTraffic: 5000000,
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
    nameEn: "Gangnam-daero Media Pole G-LIGHT",
    location: "강남역-신논현역 760m 구간",
    locationEn: "760m section between Gangnam Stn – Sinnonhyeon Stn",
    region: "seoul",
    type: "digital",
    price: 4000,
    lat: 37.4979,
    lng: 127.0276,
    dailyFootTraffic: 300000,
    monthlyFootTraffic: 9000000,
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
    nameEn: "Sinnonhyeon DSG Building LED",
    location: "강남대로 신논현역 사거리",
    locationEn: "Sinnonhyeon Stn intersection, Gangnam-daero",
    region: "seoul",
    type: "digital",
    price: 2800,
    lat: 37.5044,
    lng: 127.0254,
    dailyFootTraffic: 250000,
    monthlyFootTraffic: 7500000,
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
    nameEn: "Cheongdam SS Tower LED",
    location: "서울 강남구 학동사거리",
    locationEn: "Hakdong intersection, Gangnam-gu, Seoul",
    region: "seoul",
    type: "digital",
    price: 3200,
    lat: 37.5169,
    lng: 127.0397,
    dailyFootTraffic: 200000,
    monthlyFootTraffic: 6000000,
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
    nameEn: "Seongsu Bando Exterior Ad",
    location: "서울 성동구 성수동2가",
    locationEn: "Seongsu-dong 2-ga, Seongdong-gu, Seoul",
    region: "seoul",
    type: "billboard",
    price: 2000,
    lat: 37.5445,
    lng: 127.056,
    dailyFootTraffic: 180000,
    monthlyFootTraffic: 5400000,
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
    nameEn: "Seongsu Station Line 2 Digital Ad",
    location: "서울 성동구 성수역",
    locationEn: "Seongsu Station, Seoul",
    region: "seoul",
    type: "subway",
    price: 1500,
    lat: 37.5445,
    lng: 127.0559,
    dailyFootTraffic: 100000,
    monthlyFootTraffic: 3000000,
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
    nameEn: "COEX Parnas Media Tower",
    location: "삼성역 코엑스",
    locationEn: "COEX, Samsung Station, Seoul",
    region: "seoul",
    type: "digital",
    price: 3500,
    lat: 37.5085,
    lng: 127.0635,
    dailyFootTraffic: 300000,
    monthlyFootTraffic: 9000000,
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
    nameEn: "Seomyeon Station Digital Screen",
    location: "부산 부산진구",
    locationEn: "Busanjin-gu, Busan",
    region: "busan",
    type: "digital",
    price: 1500,
    lat: 35.1579,
    lng: 129.0593,
    dailyFootTraffic: 140000,
    monthlyFootTraffic: 4200000,
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
    nameEn: "Busan Station Subway Ad",
    location: "부산 동구",
    locationEn: "Dong-gu, Busan",
    region: "busan",
    type: "subway",
    price: 900,
    lat: 35.115,
    lng: 129.041,
    dailyFootTraffic: 85000,
    monthlyFootTraffic: 2550000,
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
    nameEn: "Jeju Airport Digital Ad",
    location: "제주시",
    locationEn: "Jeju City",
    region: "jeju",
    type: "digital",
    price: 2200,
    lat: 33.506,
    lng: 126.493,
    dailyFootTraffic: 110000,
    monthlyFootTraffic: 3300000,
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
    nameEn: "Jungmun Resort Entrance Billboard",
    location: "서귀포시",
    locationEn: "Seogwipo",
    region: "jeju",
    type: "billboard",
    price: 1000,
    lat: 33.252,
    lng: 126.412,
    dailyFootTraffic: 65000,
    monthlyFootTraffic: 1950000,
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
    nameEn: "National City Bus Loop",
    location: "전국 주요 도시",
    locationEn: "Major cities nationwide",
    region: "national",
    type: "bus",
    price: 600,
    lat: 36.5,
    lng: 127.9,
    dailyFootTraffic: 350000,
    monthlyFootTraffic: 10500000,
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
    type: "billboard",
    price: 3500,
    lat: 37.5,
    lng: 127.0,
    dailyFootTraffic: 220000,
    monthlyFootTraffic: 6600000,
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

export const typeLabels: Record<string, { ko: string; en: string }> = {
  billboard: { ko: "빌보드", en: "Billboard" },
  digital: { ko: "디지털", en: "Digital" },
  subway: { ko: "지하철", en: "Subway" },
  bus: { ko: "버스/트럭", en: "Bus/Truck" },
};
