import assert from "node:assert/strict";
import test from "node:test";
import {
  planCartItemFromCatalog,
  planCartItemFromMediaItem,
  planCartOnlineLineTotalWonSnapshot,
} from "@/lib/plan-cart-item-builders";
import {
  addToPlanCart,
  clearPlanCart,
  getPlanCart,
  replacePlanCart,
} from "@/lib/plan-cart";

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
  ...calculableOnline,
  id: "online-inquiry-1",
  name: "문의 온라인",
  onlineSpec: {
    platform: "Meta",
    minBudget: null,
    cpcMin: null,
    cpcMax: null,
    cpmMin: null,
    cpmMax: null,
  },
};

test("planCartOnlineLineTotalWonSnapshot — calculable seeds minBudget", () => {
  assert.equal(planCartOnlineLineTotalWonSnapshot(calculableOnline), 2_000_000);
});

test("planCartOnlineLineTotalWonSnapshot — inquiry and offline omit budget", () => {
  assert.equal(planCartOnlineLineTotalWonSnapshot(inquiryOnline), undefined);
  assert.equal(
    planCartOnlineLineTotalWonSnapshot({
      catalogChannel: "offline",
      onlineSpec: undefined,
    }),
    undefined,
  );
});

test("planCartItemFromCatalog — online calculable carries lineTotalWon snapshot", () => {
  const item = planCartItemFromCatalog(calculableOnline, "search");
  assert.equal(item.catalogChannel, "online");
  assert.equal(item.lineTotalWon, 2_000_000);
});

test("planCartItemFromMediaItem — default minBudget when spec has no minBudget", () => {
  const item = planCartItemFromMediaItem(
    {
      ...calculableOnline,
      onlineSpec: {
        platform: "Google",
        minBudget: undefined,
        cpcMin: 100,
        cpcMax: 500,
        cpmMin: null,
        cpmMax: null,
      },
      sampleImages: [],
      location: "온라인",
      locationEn: "Online",
      nameEn: "Google",
    },
    "search",
  );
  assert.equal(item.lineTotalWon, 1_000_000);
});

test("normalizeItem round-trip preserves catalogChannel and lineTotalWon", () => {
  clearPlanCart();
  const built = planCartItemFromCatalog(calculableOnline, "search");
  replacePlanCart({
    items: [{ ...built, addedAt: new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  });
  const stored = getPlanCart().items[0]!;
  assert.equal(stored.catalogChannel, "online");
  assert.equal(stored.lineTotalWon, 2_000_000);
});

test("addToPlanCart — inquiry online still blocked (commit 2)", () => {
  clearPlanCart();
  const built = planCartItemFromCatalog(inquiryOnline, "search");
  const result = addToPlanCart(built);
  assert.deepEqual(result, { ok: false, reason: "online_blocked" });
  assert.equal(getPlanCart().items.length, 0);
});
