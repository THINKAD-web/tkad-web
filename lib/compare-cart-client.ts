import type { MediaItem } from "@/lib/media-data";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";

export type CompareCartEntry = { id: string; name: string; nameEn: string };

const STORAGE_KEY = "tkad-compare-cart-v1";

export const COMPARE_CART_CHANGE_EVENT = "tkad-compare-cart-change";

export function getCompareCartEntries(): CompareCartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is CompareCartEntry =>
          x !== null &&
          typeof x === "object" &&
          typeof (x as CompareCartEntry).id === "string" &&
          typeof (x as CompareCartEntry).name === "string",
      )
      .map((x) => ({
        id: x.id,
        name: x.name,
        nameEn:
          typeof x.nameEn === "string" && x.nameEn.trim()
            ? x.nameEn
            : x.name,
      }))
      .slice(0, COMPARE_MAX_ITEMS);
  } catch {
    return [];
  }
}

export function setCompareCartEntries(entries: CompareCartEntry[]): void {
  if (typeof window === "undefined") return;
  const next = entries.slice(0, COMPARE_MAX_ITEMS);
  let prevSerialized = "";
  try {
    prevSerialized = localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    /* ignore */
  }
  const nextSerialized = JSON.stringify(next);
  if (prevSerialized === nextSerialized) return;
  try {
    localStorage.setItem(STORAGE_KEY, nextSerialized);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(COMPARE_CART_CHANGE_EVENT));
}

export function subscribeCompareCart(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  const onLocal = () => onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(COMPARE_CART_CHANGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(COMPARE_CART_CHANGE_EVENT, onLocal);
  };
}

export function minimalMediaFromCompareEntry(e: CompareCartEntry): MediaItem {
  return {
    id: e.id,
    name: e.name,
    nameEn: e.nameEn || e.name,
    location: "",
    locationEn: "",
    region: "seoul",
    type: "digital",
    price: 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: [],
  };
}

export function entriesToCompareMediaItems(
  entries: CompareCartEntry[],
  catalog: MediaItem[],
): MediaItem[] {
  return entries.slice(0, COMPARE_MAX_ITEMS).map((e) => {
    const full = catalog.find((m) => m.id === e.id);
    return full ?? minimalMediaFromCompareEntry(e);
  });
}
