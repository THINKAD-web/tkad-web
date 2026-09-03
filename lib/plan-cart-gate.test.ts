import assert from "node:assert/strict";
import test from "node:test";
import {
  planCartItemFromCatalog,
  planCartItemFromMediaItem,
} from "@/lib/plan-cart-item-builders";
import {
  addManyToPlanCart,
  addToPlanCart,
  clearPlanCart,
  getPlanCart,
} from "@/lib/plan-cart";
import { canAddMediaToPlanCart } from "@/lib/pricing-unavailable";
import { planCartLineMonthlyWon } from "@/lib/plan-cart-pricing";
import { buildQuoteMediaSelectionSnapshotsFromCartItem } from "@/lib/quote-snapshot-build";
import type { MediaItem } from "@/lib/media-data";

if (typeof globalThis.window === "undefined") {
  const store = new Map<string, string>();
  globalThis.window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window & typeof globalThis.window;
}

const calculableOnline = {
  id: "online-calc-1",
  name: "구글 검색",
  type: "online",
  region: "online",
  price: 0,
  catalogChannel: "online" as const,
  onlineSpec: {
    platform: "Google",
    minBudget: 2_000_000,
    cpcMin: 100,
    cpcMax: 500,
    cpmMin: null,
    cpmMax: null,
  },
};

const inquiryOnline = {
  id: "youtube-action",
  name: "YouTube 액션",
  type: "online",
  region: "online",
  price: 0,
  catalogChannel: "online" as const,
  onlineSpec: {
    platform: "YouTube",
    minBudget: null,
    cpcMin: null,
    cpcMax: null,
    cpmMin: null,
    cpmMax: null,
  },
};

const offline = {
  id: "ooh-1",
  name: "OOH",
  type: "dooh",
  region: "seoul",
  price: 3_000_000,
  catalogChannel: "offline" as const,
};

test("canAddMediaToPlanCart — calculable online with budget snapshot", () => {
  assert.equal(
    canAddMediaToPlanCart({
      catalogChannel: "online",
      lineTotalWon: 2_000_000,
    }),
    true,
  );
  assert.equal(canAddMediaToPlanCart(calculableOnline), true);
});

test("canAddMediaToPlanCart — inquiry online blocked", () => {
  assert.equal(canAddMediaToPlanCart(inquiryOnline), false);
  assert.equal(
    canAddMediaToPlanCart({ catalogChannel: "online", lineTotalWon: undefined }),
    false,
  );
});

test("addToPlanCart — calculable online allowed (commit 2)", () => {
  clearPlanCart();
  const built = planCartItemFromCatalog(calculableOnline, "search");
  const result = addToPlanCart(built);
  assert.deepEqual(result, { ok: true, added: true });
  assert.equal(getPlanCart().items[0]?.lineTotalWon, 2_000_000);
});

test("addManyToPlanCart — filters inquiry online from bulk (recommend path)", () => {
  clearPlanCart();
  const bulk = addManyToPlanCart([
    planCartItemFromCatalog(calculableOnline, "ai_recommend"),
    planCartItemFromCatalog(inquiryOnline, "ai_recommend"),
    planCartItemFromCatalog(offline, "ai_recommend"),
  ]);
  assert.equal(bulk.added, 2);
  assert.equal(bulk.skippedOnlineBlocked, 1);
  const ids = getPlanCart().items.map((i) => i.mediaId);
  assert.deepEqual(ids, ["online-calc-1", "ooh-1"]);
  assert.ok(!ids.includes("youtube-action"));
});

test("plan cart online pricing uses snapshotted lineTotalWon", () => {
  const item = planCartItemFromMediaItem(
    {
      ...calculableOnline,
      sampleImages: [],
      location: "온라인",
      locationEn: "Online",
      nameEn: "Google",
    },
    "search",
  );
  const media = calculableOnline as MediaItem;
  assert.equal(planCartLineMonthlyWon({ ...item, addedAt: "" }, media), 2_000_000);
  const snaps = buildQuoteMediaSelectionSnapshotsFromCartItem({
    media,
    item: { ...item, addedAt: "" },
    isKo: true,
    periodCtx: { months: 1 },
  });
  assert.equal(snaps[0]?.lineTotalWon, 2_000_000);
});
