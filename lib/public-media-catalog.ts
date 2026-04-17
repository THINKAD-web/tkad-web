import type { Media, MediaAdvertiserExecution } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  dedupeImageUrls,
  getMediaById,
  mediaData,
  type MediaItem,
  type MediaPriceOption,
  type MediaPricePeriodKey,
} from "@/lib/media-data";
import { fetchPublicMediaNetworks } from "@/lib/media-network-public";
import { keywordFilterItemToMediaItem } from "@/lib/keyword-filter-media-detail";
import { getMediaBrowseMockCatalog } from "@/lib/media-browse-catalog";

/** Catalog/detail 쿼리용: 집행 이력으로 광고주 문자열 생성 */
export type MediaWithAdvertiserExecutions = Media & {
  advertiserExecutions?: Pick<MediaAdvertiserExecution, "advertiserName">[];
};

function buildPastAdvertisersFromExecutions(
  executions: Pick<MediaAdvertiserExecution, "advertiserName">[] | undefined,
): string | undefined {
  if (!executions?.length) return undefined;
  const seen = new Set<string>();
  const names: string[] = [];
  for (const e of executions) {
    const n = e.advertiserName.trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    names.push(n);
  }
  return names.length ? names.join(", ") : undefined;
}

/** nearby_facilities + stations + landmarks 를 비교·목록용 한 줄로 */
function buildNearbyFacilitiesDisplay(m: Media): string | undefined {
  const parts = [m.nearbyFacilities, m.nearbyStations, m.nearbyLandmarks]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

/**
 * Korean → English media name fallback map.
 * Used when the DB `nameEn` column is null so the /en page shows English names
 * instead of falling back to Korean.
 */
const koToEnNameMap: Record<string, string> = {
  "강남대로 한승빌딩 아트월": "Hansung Building Artwall, Gangnam-daero",
  "성수역 디지털 15": "Seongsu Station Digital 15",
  "삼성역 인피니티로드": "Samsung Station Infinity Road",
  "코엑스 K-POP 스퀘어": "COEX K-POP Square LED Display",
  "강남대로 미디어폴 G-LIGHT": "G-LIGHT Media Poles, Gangnam-daero",
  "신논현역 DSG빌딩 전광판": "Sinnonhyeon Station DSG Building LED",
  "청담동 학동사거리 SS타워 전광판": "Cheongdam SS Tower LED Display",
  "성수동 반도 외벽광고": "Seongsu Bando Building Exterior Ad",
  "지하철 2호선 성수역 디지털광고": "Line 2 Seongsu Station Digital Ad",
  "서면역 디지털 스크린": "Seomyeon Station Digital Screen",
  "부산역 지하철 광고": "Busan Station Subway Advertisement",
  "제주공항 디지털 광고": "Jeju Airport Digital Advertisement",
  "코엑스 파르나스 미디어타워": "COEX Parnas Media Tower",
  "중문관광단지 입구 빌보드": "Jungmun Resort Entrance Billboard",
  "전국 시내버스 루프": "Nationwide City Bus Interior Ads",
  "전국 고속도로 빌보드 패키지": "National Highway Billboard Package",
  "강남 테헤란로 미디어월": "Gangnam Teheran-ro Media Wall",
  "성수 연무장길 디지털": "Seongsu Yeonmujang-gil Digital",
  "홍대입구역 디지털 패널": "Hongdae Station Digital Panel",
  "여의도 IFC 대형 LED": "Yeouido IFC Large LED",
  "명동 중앙길 빌보드": "Myeongdong Main Street Billboard",
  "신논현 강남대로 LED": "Sinnonhyeon Gangnam-daero LED",
  "잠실역 디지털 사이니지": "Jamsil Station Digital Signage",
  "서울역 대형 전광판": "Seoul Station Large LED Display",
  "홍대 걷고싶은길 패널": "Hongdae Walking Street Panel",
  "선릉역 디지털 미디어월": "Seolleung Station Digital Media Wall",
  "건대입구역 LED 전광판": "Konkuk Univ. Station LED Display",
  "압구정 로데오거리 디지털": "Apgujeong Rodeo Street Digital",
  "이태원 해밀턴호텔 전광판": "Itaewon Hamilton Hotel LED Display",
  "강남역 지하상가 디지털": "Gangnam Station Underground Digital",
  "광화문 광장 대형 전광판": "Gwanghwamun Square Large LED",
  "을지로 디지털 미디어월": "Euljiro Digital Media Wall",
  "부산 해운대 해수욕장 LED": "Busan Haeundae Beach LED",
  "대구 동성로 디지털 사이니지": "Daegu Dongseong-ro Digital Signage",
  "인천공항 디지털 광고": "Incheon Airport Digital Advertisement",
};

function resolveNameEn(koreanName: string, dbNameEn: string | null | undefined): string {
  if (dbNameEn?.trim()) return dbNameEn;
  return koToEnNameMap[koreanName] ?? koreanName;
}

/** Map Prisma row → public `MediaItem` (list/detail/compare). */
export function prismaMediaToMediaItem(m: MediaWithAdvertiserExecutions): MediaItem {
  const lat = m.latitude ?? 37.5665;
  const lng = m.longitude ?? 126.978;
  const daily = m.dailyFootfall ?? 0;
  const imgs = dedupeImageUrls(
    [...(m.image ? [m.image] : []), ...(m.extractedImages ?? [])].filter(
      (x): x is string => typeof x === "string" && Boolean(x.trim()),
    ),
  );

  const size =
    m.width && m.height
      ? `${m.width} × ${m.height}`
      : m.widthM != null && m.heightM != null
        ? `${m.widthM}m × ${m.heightM}m`
        : undefined;

  const locationEn =
    [m.district, m.city].filter(Boolean).join(", ") || m.location;

  const priceOptions: MediaPriceOption[] | undefined = (() => {
    const raw = (m as unknown as { priceOptions?: unknown }).priceOptions;
    if (!raw) return undefined;
    try {
      const arr =
        typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
      if (!Array.isArray(arr)) return undefined;
      const normalized: MediaPriceOption[] = [];
      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        const label = rec.label;
        const price = rec.price;
        const period = rec.period as
          | MediaPricePeriodKey
          | string
          | undefined;
        if (typeof label !== "string") continue;
        if (typeof price !== "number") continue;
        const description =
          typeof (item as { description?: unknown }).description === "string"
            ? (item as { description: string }).description.trim() || undefined
            : undefined;
        normalized.push({ label, price, period, description });
      }
      return normalized.length ? normalized : undefined;
    } catch {
      return undefined;
    }
  })();

  return {
    id: m.id,
    name: m.name,
    nameEn: resolveNameEn(m.name, m.nameEn),
    location: m.location,
    locationEn,
    region: m.region,
    availability: (m as unknown as { availability?: string }).availability as
      | "available"
      | "reserved"
      | "maintenance"
      | undefined,
    subCategory: m.subCategory?.trim() || undefined,
    tags: m.tags?.length ? [...m.tags] : undefined,
    city: m.city?.trim() || undefined,
    district: m.district?.trim() || undefined,
    nearbyStations: m.nearbyStations?.trim() || undefined,
    nearbyLandmarks: m.nearbyLandmarks?.trim() || undefined,
    type: m.type,
    price: m.price,
    lat,
    lng,
    dailyFootTraffic: daily,
    impressions: m.impressions ?? undefined,
    monthlyFootTraffic: m.impressions ?? undefined,
    reach: m.reach ?? undefined,
    frequency: m.frequency ?? undefined,
    cpm: m.cpm ?? undefined,
    engagementRate: m.engagementRate ?? undefined,
    widthM: m.widthM ?? undefined,
    heightM: m.heightM ?? undefined,
    size,
    resolution: m.resolution ?? undefined,
    brightness: undefined,
    targetAge: m.targetAge ?? undefined,
    visibilityScore: m.visibilityScore,
    features: m.effectMemo ?? m.description ?? undefined,
    featuresEn: m.effectMemo ?? m.description ?? undefined,
    catalogDescription: m.description?.trim() || undefined,
    catalogDescriptionEn: m.description?.trim() || undefined,
    description: m.description?.trim() || undefined,
    descriptionEn: m.description?.trim() || undefined,
    dailyExposure:
      m.impressions != null ? String(m.impressions) : undefined,
    sampleImages: imgs.length > 0 ? imgs : [],
    operatingHours: m.operatingHours ?? undefined,
    operatingHoursEn: m.operatingHours ?? undefined,
    installYear: m.installYear ?? undefined,
    ...(() => {
      const manual = m.pastAdvertisers?.trim() || undefined;
      const fromExec = buildPastAdvertisersFromExecutions(m.advertiserExecutions);
      const line = manual || fromExec;
      return {
        advertiserHistory: line,
        advertiserHistoryEn: line,
      };
    })(),
    nearbyFacilities: buildNearbyFacilitiesDisplay(m),
    nearbyFacilitiesEn: buildNearbyFacilitiesDisplay(m),
    caseStudyPhotos: undefined,
    pricePeriod: normalizePricePeriod(m.pricePeriod),
    priceOptions,
  };
}

function normalizePricePeriod(
  v: string | null | undefined,
): MediaPricePeriodKey {
  if (v === "biweekly" || v === "week" || v === "day" || v === "month") {
    return v;
  }
  return "month";
}

const catalogInclude = {
  advertiserExecutions: {
    select: { advertiserName: true } as const,
    orderBy: { createdAt: "desc" as const },
  },
} as const;

async function appendNetworksIfAny(base: MediaItem[]): Promise<MediaItem[]> {
  try {
    const networks = await fetchPublicMediaNetworks();
    return networks.length > 0 ? [...base, ...networks] : base;
  } catch {
    return base;
  }
}

/** 비브라우즈 페이지·API용. `/media` 목록은 `fetchMediaBrowseCatalog()`(`lib/media-browse-catalog`) 사용. */
export async function fetchPublicMediaCatalog(): Promise<MediaItem[]> {
  const forceMockOnly =
    process.env.PUBLIC_MEDIA_FORCE_MOCK_CATALOG === "1" ||
    process.env.PUBLIC_MEDIA_FORCE_MOCK_CATALOG === "true";

  if (!isDatabaseConfigured() || forceMockOnly) {
    return appendNetworksIfAny(getMediaBrowseMockCatalog());
  }

  try {
    const db = getPrisma();
    const rows = await db.media.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: catalogInclude,
    });
    const dbItems = rows.map(prismaMediaToMediaItem);
    return appendNetworksIfAny(dbItems);
  } catch {
    return appendNetworksIfAny(getMediaBrowseMockCatalog());
  }
}

/**
 * 홈 추천 매체 (`app/[locale]/page.tsx` TOP 3·Verified 그리드).
 * - DB 연결됨: `isFeatured=true`만 우선, `featuredOrder` 오름차순(null은 뒤). 없으면 활성 매체 최신순.
 * - DB에 행이 없거나 쿼리 실패: 빈 배열(목업 `mediaData` 미사용).
 * - DB 미설정(로컬 등): 샘플 `mediaData` 상한만 반환.
 */
export async function fetchHomeFeaturedMedia(max = 4): Promise<MediaItem[]> {
  if (!isDatabaseConfigured()) {
    return mediaData.slice(0, max);
  }
  try {
    const db = getPrisma();
    const featured = await db.media.findMany({
      where: { isActive: true, isFeatured: true },
      include: catalogInclude,
    });
    if (featured.length > 0) {
      const sorted = [...featured].sort((a, b) => {
        const ao = a.featuredOrder ?? 9999;
        const bo = b.featuredOrder ?? 9999;
        if (ao !== bo) return ao - bo;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      return sorted.slice(0, max).map(prismaMediaToMediaItem);
    }
    const fallback = await db.media.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      take: max,
      include: catalogInclude,
    });
    if (fallback.length > 0) {
      return fallback.map(prismaMediaToMediaItem);
    }
    return [];
  } catch {
    return [];
  }
}

/** 홈 인기 매체: 조회수 높은 순. */
export async function fetchHomePopularMedia(max = 4): Promise<MediaItem[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const db = getPrisma();
    const rows = await db.media.findMany({
      where: { isActive: true },
      orderBy: [{ updatedAt: "desc" }],
      take: max,
      include: catalogInclude,
    });
    return rows.map(prismaMediaToMediaItem);
  } catch {
    return [];
  }
}

/**
 * 플래너 전용: 활성 매체만. DB 미설정·조회 오류·0건이면 빈 목록(목업 `mediaData` 미사용).
 */
export async function fetchPlannerMediaCatalog(): Promise<{
  catalog: MediaItem[];
  databaseEmpty: boolean;
}> {
  if (!isDatabaseConfigured()) {
    return { catalog: [], databaseEmpty: true };
  }
  try {
    const db = getPrisma();
    const rows = await db.media.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
      include: catalogInclude,
    });
    if (rows.length === 0) {
      return { catalog: [], databaseEmpty: true };
    }
    return {
      catalog: rows.map(prismaMediaToMediaItem),
      databaseEmpty: false,
    };
  } catch {
    return { catalog: [], databaseEmpty: true };
  }
}

/** Detail: static catalog first, keyword-filter JSON, then DB by cuid (active only). */
export async function resolveMediaForDetail(
  id: string,
): Promise<MediaItem | null> {
  const fromStatic = getMediaById(id);
  if (fromStatic) {
    return {
      ...fromStatic,
      pricePeriod: normalizePricePeriod(fromStatic.pricePeriod),
    };
  }
  const fromKeywordFilter = keywordFilterItemToMediaItem(id);
  if (fromKeywordFilter) return fromKeywordFilter;
  if (!isDatabaseConfigured()) return null;
  try {
    const db = getPrisma();
    const row = await db.media.findFirst({
      where: { id, isActive: true },
      include: {
        advertiserExecutions: {
          select: { advertiserName: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return row ? prismaMediaToMediaItem(row) : null;
  } catch {
    return null;
  }
}
