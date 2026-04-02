import keywordFilterJson from "@/data/media-items-keyword-filter.json";
import { expandRawKeywordRecord } from "@/lib/keyword-filter-json-normalize";
import type { KeywordFilterMediaItem } from "@/lib/media-keyword-filter-types";
import type { KeywordFilterDetailMeta, MediaItem } from "@/lib/media-data";

const rawList = (keywordFilterJson as { mediaItems: Record<string, unknown>[] })
  .mediaItems;

function normalizeSet(arr: readonly string[]): Set<string> {
  return new Set(
    arr.map((s) => s.trim()).filter(Boolean),
  );
}

function scoreSimilarKeywordItems(
  a: KeywordFilterMediaItem,
  b: KeywordFilterMediaItem,
): number {
  if (a.id === b.id) return -1;
  const regA = normalizeSet(a.region);
  const regB = normalizeSet(b.region);
  const tgtA = normalizeSet(a.target);
  const tgtB = normalizeSet(b.target);
  let s = 0;
  for (const x of regA) {
    if (regB.has(x)) s += 3;
  }
  for (const x of tgtA) {
    if (tgtB.has(x)) s += 2;
  }
  const mediaOverlap = a.media.some((m) => b.media.includes(m));
  if (mediaOverlap) s += 1;
  return s;
}

export function getAllKeywordFilterMediaIds(): string[] {
  return rawList.map((r) => String(r.id ?? ""));
}

export function getKeywordFilterRawById(
  id: string,
): Record<string, unknown> | undefined {
  return rawList.find((r) => String(r.id) === id);
}

function inferRegionCode(regions: string[]): string {
  const s = regions.join(" ");
  if (s.includes("제주")) return "jeju";
  if (s.includes("부산")) return "busan";
  if (s.includes("광주")) return "gwangju";
  if (s.includes("인천")) return "incheon";
  if (s.includes("경기") || s.includes("수원") || s.includes("성남")) {
    return "gyeonggi";
  }
  return "seoul";
}

function inferTypeFromMediaLabels(media: string[]): string {
  const joined = media.join(" ");
  if (/빌보드|고정|초대형\s*포스터/i.test(joined)) return "static";
  if (/이동|버스|택시|트럭/i.test(joined)) return "mobile";
  return "digital";
}

function approximateLatLng(regions: string[]): { lat: number; lng: number } {
  const s = regions.join(" ");
  if (s.includes("홍대") || s.includes("마포") || s.includes("합정")) {
    return { lat: 37.5563, lng: 126.9236 };
  }
  if (s.includes("성수")) return { lat: 37.5447, lng: 127.0558 };
  if (s.includes("코엑스") || s.includes("삼성")) {
    return { lat: 37.5113, lng: 127.0592 };
  }
  if (s.includes("강남") || s.includes("역삼") || s.includes("논현")) {
    return { lat: 37.4979, lng: 127.0276 };
  }
  if (s.includes("신논현")) return { lat: 37.5045, lng: 127.0246 };
  if (s.includes("여의도")) return { lat: 37.5219, lng: 126.9242 };
  if (s.includes("광화문") || s.includes("종로") || s.includes("을지로")) {
    return { lat: 37.572, lng: 126.9769 };
  }
  if (s.includes("압구정") || s.includes("도산")) {
    return { lat: 37.5269, lng: 127.0414 };
  }
  if (s.includes("이태원") || s.includes("한남")) {
    return { lat: 37.5347, lng: 126.9947 };
  }
  if (s.includes("명동")) return { lat: 37.5636, lng: 126.9826 };
  if (s.includes("건대") || s.includes("광진")) {
    return { lat: 37.5407, lng: 127.0692 };
  }
  return { lat: 37.5665, lng: 126.978 };
}

function idFootTrafficSeed(id: string): number {
  return id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

export function keywordFilterMediaItemToMediaItem(
  k: KeywordFilterMediaItem,
  titleEnOverride?: string,
): MediaItem {
  const { lat, lng } = approximateLatLng(k.region);
  const region = inferRegionCode(k.region);
  const type = inferTypeFromMediaLabels(k.media);
  const displayName = k.mediaName?.trim() || k.title;
  const locationLine =
    [k.full_address, k.city, ...k.region].filter(Boolean).slice(0, 4).join(" · ") ||
    [...k.region].slice(0, 4).join(" · ");
  const feat = [...(k.features ?? []), ...(k.specialFeature ?? [])]
    .filter(Boolean)
    .join(", ");
  /** 카탈로그 슬라이더·고급 필터는 만원 단위. budgetMin/Max(원)는 메타·상세용으로 유지 */
  const ppm = k.price_per_month;
  const priceMan =
    ppm != null && ppm > 0 && Number.isFinite(ppm)
      ? Math.round(ppm)
      : Math.max(1, Math.round((k.budgetMin + k.budgetMax) / 2 / 10_000));
  const seed = idFootTrafficSeed(k.id);
  const daily = 45_000 + (seed % 380_000);

  const keywordFilter: KeywordFilterDetailMeta = {
    specialFeature: [...k.specialFeature],
    searchKeywords: [...k.searchKeywords],
    budgetMin: k.budgetMin,
    budgetMax: k.budgetMax,
    priceText: k.priceText,
    exposureTime: [...k.exposureTime],
    duration: [...k.duration],
    status: k.status,
    regionLabels: [...k.region],
    mediaLabels: [...k.media],
    targetLabels: [...k.target],
    industryLabels: [...k.industry],
  };

  const operatingFromExposure =
    k.exposureTime.length > 0 ? k.exposureTime.join(" · ") : undefined;

  const titleEn = titleEnOverride?.trim() || k.title;

  const longDescriptionParts = [
    k.title,
    k.mediaName?.trim(),
    k.description?.trim(),
  ].filter((x): x is string => Boolean(x));
  const longDescriptionCombined = [...new Set(longDescriptionParts)].join(" · ");

  const vis = k.visibilityScore;
  const visibilityScore =
    typeof vis === "number" &&
    Number.isFinite(vis) &&
    vis >= 0 &&
    vis <= 100
      ? Math.round(vis)
      : 58 + (seed % 35);

  return {
    id: k.id,
    name: displayName,
    nameEn: titleEn,
    location: locationLine || displayName,
    locationEn: locationLine || displayName,
    region,
    type,
    price: priceMan,
    pricePeriod: "month",
    lat,
    lng,
    dailyFootTraffic: daily,
    monthlyFootTraffic: daily * 30,
    impressions: daily * 30,
    size: k.size,
    visibilityScore,
    features: feat || undefined,
    featuresEn: feat || undefined,
    operatingHours: operatingFromExposure,
    operatingHoursEn: operatingFromExposure,
    targetAge: k.target.slice(0, 4).join(", "),
    sampleImages: k.thumbnail?.trim() ? [k.thumbnail.trim()] : [],
    tags: ["keyword-filter-catalog", k.title, ...k.region.slice(0, 3)],
    longDescriptionKo: longDescriptionCombined,
    longDescriptionEn: longDescriptionCombined,
    description: longDescriptionCombined,
    descriptionEn: longDescriptionCombined,
    keywordFilter,
    priceOptions: k.priceOptions?.length ? [...k.priceOptions] : undefined,
  };
}

/** `/media` 공개 카탈로그에 합칠 키워드 JSON 매체 전체 */
export function getKeywordFilterCatalogMediaItems(): MediaItem[] {
  return rawList.map((r) => {
    const k = expandRawKeywordRecord(r as Record<string, unknown>);
    const rec = r as { nameEn?: unknown; titleEn?: unknown };
    const titleEn =
      typeof rec.nameEn === "string"
        ? rec.nameEn.trim()
        : typeof rec.titleEn === "string"
          ? rec.titleEn.trim()
          : undefined;
    return keywordFilterMediaItemToMediaItem(k, titleEn);
  });
}

export function keywordFilterItemToMediaItem(id: string): MediaItem | null {
  const raw = getKeywordFilterRawById(id);
  if (!raw) return null;
  const k = expandRawKeywordRecord(raw);
  const titleEn =
    typeof raw.nameEn === "string"
      ? raw.nameEn.trim()
      : typeof raw.titleEn === "string"
        ? raw.titleEn.trim()
        : undefined;
  return keywordFilterMediaItemToMediaItem(k, titleEn);
}

/** 같은 region/target 겹침이 큰 다른 키워드 카탈로그 매체 (최대 `limit`). */
export function getSimilarKeywordFilterMediaItems(
  id: string,
  limit = 3,
): MediaItem[] {
  const expanded = rawList.map((r) => expandRawKeywordRecord(r));
  const self = expanded.find((r) => r.id === id);
  if (!self) return [];
  const scored = expanded
    .filter((r) => r.id !== id)
    .map((r) => ({ r, s: scoreSimilarKeywordItems(self, r) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const pick = scored.slice(0, limit).map((x) => x.r);
  if (pick.length < limit) {
    const rest = expanded.filter(
      (r) => r.id !== id && !pick.some((p) => p.id === r.id),
    );
    for (const r of rest) {
      if (pick.length >= limit) break;
      pick.push(r);
    }
  }
  return pick.map((k) => keywordFilterMediaItemToMediaItem(k));
}

/** 히어로·칩용: 중복 없이 상단 태그 후보 */
export function heroTagCandidatesFromKeyword(
  kw: KeywordFilterDetailMeta,
  sizeLabel?: string,
): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  if (sizeLabel) push(sizeLabel);
  kw.regionLabels.slice(0, 2).forEach(push);
  kw.mediaLabels.slice(0, 2).forEach(push);
  kw.targetLabels.slice(0, 3).forEach(push);
  kw.industryLabels.slice(0, 2).forEach(push);
  return out.slice(0, 10);
}

/** "잘 맞는 키워드" — 앞에서부터 고정 개수 */
export function pickSearchKeywordHints(
  keywords: readonly string[],
  max = 5,
): string[] {
  return keywords.filter(Boolean).slice(0, max);
}
