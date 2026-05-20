/** 오프라인 저장 매체 (최대 20개, IndexedDB + Cache API) */

export const PWA_SAVED_MEDIA_MAX = 20;
const DB_NAME = "thinkad-pwa";
const DB_VERSION = 2;
const KV_STORE = "kv";
const SAVED_STORE = "saved-media";
const PAGE_CACHE = "thinkad-media-pages-v1";

export type SavedMediaRecord = {
  id: string;
  locale: string;
  savedAt: string;
  name: string;
  location: string;
  type: string;
  price: number;
  imageUrl?: string;
  pagePath: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KV_STORE)) {
        db.createObjectStore(KV_STORE);
      }
      if (!db.objectStoreNames.contains(SAVED_STORE)) {
        db.createObjectStore(SAVED_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function listSavedMedia(): Promise<SavedMediaRecord[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const db = await openDb();
    const rows = await new Promise<SavedMediaRecord[]>((resolve, reject) => {
      const tx = db.transaction(SAVED_STORE, "readonly");
      const req = tx.objectStore(SAVED_STORE).getAll();
      req.onsuccess = () =>
        resolve((req.result as SavedMediaRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch {
    return [];
  }
}

export async function isMediaSavedOffline(id: string): Promise<boolean> {
  const list = await listSavedMedia();
  return list.some((m) => m.id === id);
}

export async function saveMediaOffline(
  record: SavedMediaRecord,
): Promise<{ ok: boolean; reason?: "max" | "error" }> {
  if (typeof indexedDB === "undefined") {
    return { ok: false, reason: "error" };
  }
  try {
    const existing = await listSavedMedia();
    const without = existing.filter((m) => m.id !== record.id);
    if (without.length >= PWA_SAVED_MEDIA_MAX && !existing.some((m) => m.id === record.id)) {
      return { ok: false, reason: "max" };
    }
    const next = [record, ...without].slice(0, PWA_SAVED_MEDIA_MAX);
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SAVED_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      const store = tx.objectStore(SAVED_STORE);
      store.clear();
      for (const row of next) {
        store.put(row);
      }
    });
    db.close();

    if (typeof caches !== "undefined") {
      const cache = await caches.open(PAGE_CACHE);
      try {
        await cache.add(record.pagePath);
      } catch {
        await cache.add(new Request(record.pagePath, { cache: "reload" }));
      }
      if (record.imageUrl) {
        try {
          await cache.add(record.imageUrl);
        } catch {
          /* ignore CORS */
        }
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "error" };
  }
}

export async function removeSavedMedia(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const list = await listSavedMedia();
  const target = list.find((m) => m.id === id);
  const next = list.filter((m) => m.id !== id);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SAVED_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(SAVED_STORE);
    store.clear();
    for (const row of next) {
      store.put(row);
    }
  });
  db.close();
  if (target && typeof caches !== "undefined") {
    const cache = await caches.open(PAGE_CACHE);
    await cache.delete(target.pagePath);
  }
}
