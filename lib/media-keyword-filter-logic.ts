import type {
  KeywordFilterFacetKey,
  KeywordFilterMediaItem,
  KeywordFilterSelection,
} from "@/lib/media-keyword-filter-types";
import { KEYWORD_FILTER_FACET_KEYS } from "@/lib/media-keyword-filter-types";

/**
 * Hero 검색바 플레이스홀더 로테이션용 문구.
 * `/ko/media/keyword-filter` 등 한국어 UI에서 사용합니다.
 */
export const KEYWORD_FILTER_SEARCH_PLACEHOLDERS = [
  "성수 전광판 MZ 패션",
  "강남 빌보드 K-POP",
  "코엑스 Cube K-POP 팬덤",
  "도산대로 프리미엄 OOH",
  "핫플레이스 MZ 타겟 광고",
] as const;

export type KeywordFilterSearchPlaceholder =
  (typeof KEYWORD_FILTER_SEARCH_PLACEHOLDERS)[number];

/** 결과 없음 / 빈 상태에서 제안하는 인기 검색 키워드 (플레이스홀더와 겹쳐도 무방) */
export const KEYWORD_FILTER_POPULAR_KEYWORD_SUGGESTIONS = [
  "성수 전광판",
  "강남 빌보드",
  "코엑스 K-POP",
  "홍대 미디어월",
  "MZ세대",
  "신논현 전광판",
  "압구정 럭셔리",
  "여의도 LED",
] as const;

/** 검색 입력을 디바운스한 뒤 `filterKeywordMediaItems`의 `query`로 넘기면 됩니다. */
export const KEYWORD_FILTER_SEARCH_DEBOUNCE_MS = 150;

/** 정렬 모드 — UI 드롭다운 값과 1:1 */
export type KeywordFilterSortMode =
  | "recommended"
  | "priceAsc"
  | "priceDesc"
  | "titleAsc";

export const KEYWORD_FILTER_DEFAULT_SORT: KeywordFilterSortMode = "recommended";

/** 검색·필터에 포함할 통합 텍스트 (소문자 정규화 전 원문 조각) */
export function buildSearchHaystack(item: KeywordFilterMediaItem): string {
  const parts: string[] = [
    item.title,
    item.mediaName ?? "",
    item.description,
    item.status,
    item.priceText,
    item.size,
    String(item.budgetMin),
    String(item.budgetMax),
    item.full_address ?? "",
    item.city ?? "",
    item.price_per_month != null ? String(item.price_per_month) : "",
    ...(item.searchKeywords ?? []),
    ...(item.region ?? []),
    ...(item.media ?? []),
    ...(item.target ?? []),
    ...(item.industry ?? []),
    ...(item.duration ?? []),
    ...(item.exposureTime ?? []),
    ...(item.features ?? []),
    ...(item.specialFeature ?? []),
  ];
  return parts.join("\u0000").toLowerCase();
}

/** 공백으로 토큰 분리 — 복합 키워드(AND) */
export function tokenizeQuery(raw: string): string[] {
  return raw
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => t.toLowerCase());
}

export function matchesTextSearch(
  item: KeywordFilterMediaItem,
  query: string,
): boolean {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;
  const hay = buildSearchHaystack(item);
  return tokens.every((tok) => hay.includes(tok));
}

function arrayIntersectsSelected(
  itemValues: string[],
  selected: string[],
): boolean {
  if (selected.length === 0) return true;
  const set = new Set(itemValues);
  return selected.some((s) => set.has(s));
}

export function matchesFacetSelection(
  item: KeywordFilterMediaItem,
  selection: KeywordFilterSelection,
): boolean {
  for (const key of KEYWORD_FILTER_FACET_KEYS) {
    const selected = selection[key];
    if (selected.length === 0) continue;

    if (key === "size") {
      if (!selected.includes(item.size)) return false;
      continue;
    }

    const arr = item[key] as string[];
    if (!arrayIntersectsSelected(arr, selected)) return false;
  }
  return true;
}

/**
 * 텍스트 검색(AND 토큰) + 멀티 필터(그룹 내 OR, 그룹 간 AND)를 동시에 적용합니다.
 * `query`에는 UI에서 디바운스된 검색 문자열을 전달하는 것을 권장합니다.
 */
export function filterKeywordMediaItems(
  items: readonly KeywordFilterMediaItem[],
  query: string,
  selection: KeywordFilterSelection,
): KeywordFilterMediaItem[] {
  return items.filter(
    (m) => matchesTextSearch(m, query) && matchesFacetSelection(m, selection),
  );
}

/**
 * 필터·검색 결과 배열을 정렬합니다.
 *
 * - `recommended`: 원본 카탈로그(`catalogOrder`)에 나온 순서를 유지합니다.
 * - `priceAsc` / `priceDesc`: `budgetMin` / `budgetMax` 기준(동률 시 카탈로그 순).
 * - `titleAsc`: 제목 가나다·abc 순(동률 시 카탈로그 순).
 */
export function sortKeywordMediaItems(
  filtered: readonly KeywordFilterMediaItem[],
  mode: KeywordFilterSortMode,
  catalogOrder: readonly KeywordFilterMediaItem[],
): KeywordFilterMediaItem[] {
  const orderIndex = new Map<string, number>(
    catalogOrder.map((m, i) => [m.id, i]),
  );
  const recIdx = (id: string) => orderIndex.get(id) ?? 0;

  const arr = [...filtered];
  switch (mode) {
    case "recommended":
      return arr.sort((a, b) => recIdx(a.id) - recIdx(b.id));
    case "priceAsc":
      return arr.sort(
        (a, b) => a.budgetMin - b.budgetMin || recIdx(a.id) - recIdx(b.id),
      );
    case "priceDesc":
      return arr.sort(
        (a, b) => b.budgetMax - a.budgetMax || recIdx(a.id) - recIdx(b.id),
      );
    case "titleAsc":
      return arr.sort(
        (a, b) =>
          a.title.localeCompare(b.title, "ko", { sensitivity: "base" }) ||
          recIdx(a.id) - recIdx(b.id),
      );
  }
}

/** 카탈로그에서 멀티셀렉트 옵션 집계 (정렬) */
export function collectFacetOptions(
  items: readonly KeywordFilterMediaItem[],
): Record<KeywordFilterFacetKey, string[]> {
  const acc: Record<KeywordFilterFacetKey, Set<string>> = {
    region: new Set(),
    media: new Set(),
    target: new Set(),
    industry: new Set(),
    size: new Set(),
    duration: new Set(),
    exposureTime: new Set(),
    specialFeature: new Set(),
  };

  for (const m of items) {
    m.region?.forEach((v) => acc.region.add(v));
    m.media?.forEach((v) => acc.media.add(v));
    m.target?.forEach((v) => acc.target.add(v));
    m.industry?.forEach((v) => acc.industry.add(v));
    acc.size.add(m.size);
    m.duration?.forEach((v) => acc.duration.add(v));
    m.exposureTime?.forEach((v) => acc.exposureTime.add(v));
    m.specialFeature?.forEach((v) => acc.specialFeature.add(v));
  }

  const sortKo = (a: string, b: string) =>
    a.localeCompare(b, "ko", { sensitivity: "base" });

  const out = {} as Record<KeywordFilterFacetKey, string[]>;
  for (const key of KEYWORD_FILTER_FACET_KEYS) {
    out[key] = [...acc[key]].sort(sortKo);
  }
  return out;
}

export type ActiveFilterChip = {
  facet: KeywordFilterFacetKey;
  value: string;
};

export function selectionToChips(
  selection: KeywordFilterSelection,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  for (const facet of KEYWORD_FILTER_FACET_KEYS) {
    for (const value of selection[facet]) {
      chips.push({ facet, value });
    }
  }
  return chips;
}

export function toggleSelectionValue(
  prev: KeywordFilterSelection,
  facet: KeywordFilterFacetKey,
  value: string,
  checked: boolean,
): KeywordFilterSelection {
  const cur = prev[facet];
  const next = checked
    ? cur.includes(value)
      ? cur
      : [...cur, value]
    : cur.filter((v) => v !== value);
  return { ...prev, [facet]: next };
}

export function removeChip(
  prev: KeywordFilterSelection,
  facet: KeywordFilterFacetKey,
  value: string,
): KeywordFilterSelection {
  return {
    ...prev,
    [facet]: prev[facet].filter((v) => v !== value),
  };
}

const PREVIEW_TAGS_MAX_SPECIAL = 2;

/**
 * 카드용 태그 3~4개(`max`)를 목표로 합니다.
 * 먼저 primary(지역·매체·타겟·업종·규모·기간 등)를 2개까지 채운 뒤
 * `specialFeature`에서 최대 2개를 넣고, 나머지는 primary로 채웁니다.
 */
export function previewTags(item: KeywordFilterMediaItem, max = 4): string[] {
  const primaryQueue: string[] = [];
  const dedupePrimary = new Set<string>();
  const pushPrimary = (v: string | undefined) => {
    if (!v || dedupePrimary.has(v)) return;
    dedupePrimary.add(v);
    primaryQueue.push(v);
  };

  pushPrimary(item.region[0]);
  pushPrimary(item.media[0]);
  pushPrimary(item.target[0]);
  pushPrimary(item.industry[0]);
  pushPrimary(item.size);
  for (const v of item.region.slice(1)) pushPrimary(v);
  for (const v of item.media.slice(1)) pushPrimary(v);
  for (const v of item.target.slice(1)) pushPrimary(v);
  for (const v of item.industry.slice(1)) pushPrimary(v);
  pushPrimary(item.duration[0]);
  pushPrimary(item.exposureTime[0]);

  const used = new Set<string>();
  const out: string[] = [];
  const add = (v: string) => {
    if (out.length >= max || used.has(v)) return;
    used.add(v);
    out.push(v);
  };

  let pi = 0;
  while (out.length < 2 && pi < primaryQueue.length) {
    add(primaryQueue[pi]!);
    pi++;
  }

  let sfAdded = 0;
  for (const sf of item.specialFeature ?? []) {
    if (sfAdded >= PREVIEW_TAGS_MAX_SPECIAL || out.length >= max) break;
    if (used.has(sf)) continue;
    add(sf);
    sfAdded++;
  }

  while (pi < primaryQueue.length && out.length < max) {
    add(primaryQueue[pi]!);
    pi++;
  }

  return out.slice(0, max);
}

export function truncateText(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen).trim()}…`;
}

export function countActiveFilters(sel: KeywordFilterSelection): number {
  let n = 0;
  for (const k of KEYWORD_FILTER_FACET_KEYS) n += sel[k].length;
  return n;
}
