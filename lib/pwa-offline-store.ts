/** PWA 오프라인용 매체 카탈로그 스냅샷 (IndexedDB) */

export type OfflineMediaItem = {
  id: string;
  name: string;
  location: string;
  type: string;
  price: number;
  image?: string;
};

export type OfflineCatalogSnapshot = {
  savedAt: string;
  items: OfflineMediaItem[];
};

const DB_NAME = "thinkad-pwa";
const DB_VERSION = 1;
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

const CATALOG_KEY = "media-catalog-v1";

export async function saveOfflineCatalog(
  items: OfflineMediaItem[],
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  const snapshot: OfflineCatalogSnapshot = {
    savedAt: new Date().toISOString(),
    items: items.slice(0, 120),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(snapshot, CATALOG_KEY);
  });
  db.close();
}

export async function loadOfflineCatalog(): Promise<OfflineCatalogSnapshot | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const snapshot = await new Promise<OfflineCatalogSnapshot | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        tx.onerror = () => reject(tx.error);
        const req = tx.objectStore(STORE).get(CATALOG_KEY);
        req.onsuccess = () =>
          resolve((req.result as OfflineCatalogSnapshot | undefined) ?? null);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    return snapshot;
  } catch {
    return null;
  }
}

/** Cache Storage 에 저장된 API 응답 폴백 */
export async function loadCatalogFromCacheApi(): Promise<OfflineCatalogSnapshot | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open("thinkad-pwa-v3");
    const res = await cache.match("/api/public/media-catalog");
    if (!res?.ok) return null;
    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) return null;
    return {
      savedAt: res.headers.get("date") ?? new Date().toISOString(),
      items: raw.slice(0, 120).map(normalizeOfflineMedia),
    };
  } catch {
    return null;
  }
}

export function normalizeOfflineMedia(m: {
  id?: string;
  name?: string;
  location?: string;
  type?: string;
  price?: number;
  image?: string;
}): OfflineMediaItem {
  return {
    id: String(m.id ?? ""),
    name: String(m.name ?? ""),
    location: String(m.location ?? ""),
    type: String(m.type ?? ""),
    price: Number(m.price ?? 0),
    image: m.image ? String(m.image) : undefined,
  };
}
