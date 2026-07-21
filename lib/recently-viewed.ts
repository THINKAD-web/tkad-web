import type { MediaItem, MediaPricePeriodKey } from "./media-data";
import { getPrimaryMediaImageUrl } from "./media-data";
import {
  normalizeMediaPricePeriod,
  resolveMediaDisplayPrice,
} from "./media-price-format";

const STORAGE_KEY = "tkad_recently_viewed";
export const RECENTLY_VIEWED_MAX = 20;

const CHANGED_EVENT = "tkad-recently-viewed-changed";

export type RecentlyViewedRecord = {
  id: string;
  name: string;
  type: string;
  region: string;
  thumbnail: string;
  /** Display SSOT amount (cheapest option), not always raw catalog `media.price`. */
  price: number;
  /** Period for `price`; optional on legacy localStorage rows (defaults to month). */
  pricePeriod?: MediaPricePeriodKey;
  visitedAt: string;
};

function notifyChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

function isRecord(value: unknown): value is RecentlyViewedRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as RecentlyViewedRecord;
  return (
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    typeof r.type === "string" &&
    typeof r.region === "string" &&
    typeof r.thumbnail === "string" &&
    typeof r.price === "number" &&
    typeof r.visitedAt === "string"
  );
}

function legacyMediaToRecord(item: {
  id: string;
  name?: string;
  type?: string;
  region?: string;
  price?: number;
  sampleImages?: string[];
  image?: string | null;
}): RecentlyViewedRecord | null {
  if (!item.id) return null;
  const thumb =
    item.sampleImages?.[0]?.trim() ||
    (typeof item.image === "string" ? item.image.trim() : "") ||
    "";
  return {
    id: String(item.id),
    name: String(item.name ?? ""),
    type: String(item.type ?? ""),
    region: String(item.region ?? ""),
    thumbnail: thumb,
    price: typeof item.price === "number" ? item.price : 0,
    visitedAt: new Date().toISOString(),
  };
}

/** Parse localStorage — supports records, legacy id[], legacy MediaItem[]. */
export function readRecentlyViewedRecords(): RecentlyViewedRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    if (isRecord(parsed[0])) {
      return (parsed as RecentlyViewedRecord[])
        .filter(isRecord)
        .map((r) => ({
          ...r,
          pricePeriod: r.pricePeriod
            ? normalizeMediaPricePeriod(r.pricePeriod)
            : undefined,
        }))
        .slice(0, RECENTLY_VIEWED_MAX);
    }

    if (typeof parsed[0] === "string") {
      return [];
    }

    if (
      typeof parsed[0] === "object" &&
      parsed[0] !== null &&
      "id" in (parsed[0] as object)
    ) {
      const records = (parsed as { id: string }[])
        .map((x) => legacyMediaToRecord(x as Parameters<typeof legacyMediaToRecord>[0]))
        .filter((x): x is RecentlyViewedRecord => x != null);
      if (records.length > 0) {
        writeRecentlyViewedRecords(records, { notify: false });
      }
      return records.slice(0, RECENTLY_VIEWED_MAX);
    }
  } catch {
    // ignore
  }
  return [];
}

export function writeRecentlyViewedRecords(
  records: RecentlyViewedRecord[],
  options?: { notify?: boolean },
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records.slice(0, RECENTLY_VIEWED_MAX)),
    );
    if (options?.notify !== false) notifyChanged();
  } catch {
    // ignore
  }
}

export function readRecentlyViewedIds(): string[] {
  return readRecentlyViewedRecords().map((r) => r.id);
}

export function mergeRecentlyViewedRecords(
  ...groups: RecentlyViewedRecord[][]
): RecentlyViewedRecord[] {
  const byId = new Map<string, RecentlyViewedRecord>();
  for (const group of groups) {
    for (const item of group) {
      if (!item.id) continue;
      const prev = byId.get(item.id);
      if (
        !prev ||
        new Date(item.visitedAt).getTime() > new Date(prev.visitedAt).getTime()
      ) {
        byId.set(item.id, item);
      }
    }
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
    )
    .slice(0, RECENTLY_VIEWED_MAX);
}

export function mediaItemToRecentlyViewedRecord(
  media: MediaItem,
  options?: { isKo?: boolean; visitedAt?: string },
): RecentlyViewedRecord {
  const isKo = options?.isKo ?? true;
  const display = resolveMediaDisplayPrice(media);
  return {
    id: media.id,
    name: isKo ? media.name : media.nameEn || media.name,
    type: media.type,
    region: media.region,
    thumbnail: getPrimaryMediaImageUrl(media) ?? "",
    price: display.priceWon,
    pricePeriod: display.period,
    visitedAt: options?.visitedAt ?? new Date().toISOString(),
  };
}

export function addRecentlyViewedRecord(record: RecentlyViewedRecord): void {
  if (typeof window === "undefined" || !record.id) return;
  try {
    const current = readRecentlyViewedRecords();
    const filtered = current.filter((x) => x.id !== record.id);
    const updated = [{ ...record, visitedAt: record.visitedAt || new Date().toISOString() }, ...filtered].slice(
      0,
      RECENTLY_VIEWED_MAX,
    );
    writeRecentlyViewedRecords(updated, { notify: false });
    notifyChanged();
  } catch {
    // ignore
  }
}

export function addRecentlyViewedId(id: string): void {
  if (!id) return;
  const current = readRecentlyViewedRecords();
  const existing = current.find((x) => x.id === id);
  if (existing) {
    addRecentlyViewedRecord({ ...existing, visitedAt: new Date().toISOString() });
    return;
  }
  addRecentlyViewedRecord({
    id,
    name: "",
    type: "",
    region: "",
    thumbnail: "",
    price: 0,
    visitedAt: new Date().toISOString(),
  });
}

export function addRecentlyViewed(media: MediaItem, isKo = true): void {
  addRecentlyViewedRecord(mediaItemToRecentlyViewedRecord(media, { isKo }));
}

/**
 * localStorage id 목록으로 `/api/media/recently-viewed`를 호출합니다.
 * 성공 시 로컬 레코드를 최신 카탈로그 필드로 보강합니다.
 */
export async function fetchRecentlyViewedItems(): Promise<MediaItem[]> {
  if (typeof window === "undefined") return [];
  const local = readRecentlyViewedRecords();
  const ids =
    local.length > 0
      ? local.map((r) => r.id)
      : readRecentlyViewedIds();
  if (ids.length === 0) return [];

  const q = encodeURIComponent(ids.join(","));
  const res = await fetch(`/api/media/recently-viewed?ids=${q}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: MediaItem[] };
  const raw = Array.isArray(data.items) ? data.items : [];
  const items = raw.slice(0, RECENTLY_VIEWED_MAX);

  const visitedById = new Map(local.map((r) => [r.id, r.visitedAt]));
  const enriched: RecentlyViewedRecord[] = items.map((m) => {
    const base = mediaItemToRecentlyViewedRecord(m);
    const visitedAt = visitedById.get(m.id) ?? base.visitedAt;
    return { ...base, visitedAt };
  });
  const missing = local.filter((r) => !items.some((m) => m.id === r.id));
  writeRecentlyViewedRecords(
    mergeRecentlyViewedRecords(enriched, missing),
    { notify: false },
  );

  return items;
}

export function subscribeRecentlyViewedChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGED_EVENT, cb);
  return () => window.removeEventListener(CHANGED_EVENT, cb);
}

/** API가 반환한 매체 id만 localStorage에 남깁니다 (없는 id 제거). */
export function replaceRecentlyViewedIdsFromResolvedItems(
  items: Pick<MediaItem, "id">[],
): void {
  if (typeof window === "undefined") return;
  const local = readRecentlyViewedRecords();
  const allowed = new Set(items.map((m) => m.id));
  const next = local.filter((r) => allowed.has(r.id)).slice(0, RECENTLY_VIEWED_MAX);
  try {
    writeRecentlyViewedRecords(next, { notify: false });
  } catch {
    // ignore
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyChanged();
  } catch {
    // ignore
  }
}
