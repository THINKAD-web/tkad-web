import assert from "node:assert/strict";
import {
  readMapAreaSearchMode,
  writeMapAreaSearchMode,
} from "@/lib/media-map/map-area-search-mode";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "window", {
  value: globalThis,
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
  },
  configurable: true,
});

storage.clear();
assert.equal(readMapAreaSearchMode(), "auto");

writeMapAreaSearchMode("manual");
assert.equal(readMapAreaSearchMode(), "manual");

writeMapAreaSearchMode("auto");
assert.equal(readMapAreaSearchMode(), "auto");

console.log("map-area-search-mode.test: ok");
