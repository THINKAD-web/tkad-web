import assert from "node:assert/strict";
import test from "node:test";
import type { PlanCartItem } from "@/lib/plan-cart";
import { getPlanCart, replacePlanCart, updatePlanCartItem } from "@/lib/plan-cart";
import type { MediaItem } from "@/lib/media-data";
import {
  planCartItemQuoteLineFromPeriod,
  planCartLinePeriodTotalWon,
} from "@/lib/plan-cart-pricing";
import { buildQuoteWizardLineContext } from "@/lib/quote-wizard-pricing";
import { buildQuoteMediaSelectionSnapshotsFromCartItem } from "@/lib/quote-snapshot-build";
import { packagePeriodToggleMeta } from "@/lib/quote-package-period-toggle";

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

const packageMedia: MediaItem = {
  id: "pkg-1",
  name: "패키지 매체",
  nameEn: "Package",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  type: "digital",
  price: 3_000_000,
  pricePeriod: "month",
  lat: 0,
  lng: 0,
  dailyFootTraffic: 10_000,
  sampleImages: [],
  priceOptions: [{ label: "20초 3일", price: 5_000_000, period: "3days" }],
};

const plainMedia: MediaItem = {
  id: "plain-1",
  name: "Plain",
  nameEn: "Plain",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  type: "digital",
  price: 3_000_000,
  pricePeriod: "month",
  lat: 0,
  lng: 0,
  dailyFootTraffic: 10_000,
  sampleImages: [],
};

function cartItem(mediaId: string): PlanCartItem {
  return {
    mediaId,
    mediaName: mediaId,
    mediaType: "digital",
    region: "seoul",
    price: 5_000_000,
    addedFrom: "planner",
    addedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("packagePeriodToggleMeta — bundle option only", () => {
  assert.ok(packagePeriodToggleMeta(packageMedia, 0));
  assert.equal(packagePeriodToggleMeta(plainMedia, 0), null);
});

test("plan cart package period toggle persists in localStorage", () => {
  const prev = getPlanCart();
  try {
    replacePlanCart({ items: [], updatedAt: new Date().toISOString() });
    replacePlanCart({
      items: [{ ...cartItem(packageMedia.id), priceOptionIndex: 0 }],
      updatedAt: new Date().toISOString(),
    });
    updatePlanCartItem(packageMedia.id, {
      usePackagePeriod: true,
      lineCampaignDays: 3,
    });
    const stored = getPlanCart().items[0];
    assert.equal(stored?.usePackagePeriod, true);
    assert.equal(stored?.lineCampaignDays, 3);
  } finally {
    replacePlanCart(prev);
  }
});

test("cart snapshot with package period matches quote wizard line total", () => {
  const item: PlanCartItem = {
    ...cartItem(packageMedia.id),
    priceOptionIndex: 0,
    usePackagePeriod: true,
    lineCampaignDays: 3,
  };
  const periodCtx = { weeks: 4 };
  const wizard = buildQuoteWizardLineContext(packageMedia, {
    isKo: true,
    campaignPeriod: "30days",
    campaignPeriodLabel: "30days",
    priceOptionIndex: 0,
    usePackagePeriod: true,
  });
  const cartLine = planCartItemQuoteLineFromPeriod(
    item,
    packageMedia,
    "30days",
    true,
  );
  const snaps = buildQuoteMediaSelectionSnapshotsFromCartItem({
    media: packageMedia,
    item,
    isKo: true,
    periodCtx,
  });

  assert.equal(cartLine.lineTotalWon, Math.round(wizard.lineTotalMan * 10_000));
  assert.equal(cartLine.usePackagePeriod, true);
  assert.equal(snaps[0]!.lineTotalWon, cartLine.lineTotalWon);
  assert.equal(snaps[0]!.usePackagePeriod, true);
  assert.equal(snaps[0]!.lineCampaignDays, cartLine.lineCampaignDays);
});

test("package period on charges full bundle price vs prorated 7-day campaign", () => {
  const itemOff: PlanCartItem = {
    ...cartItem(packageMedia.id),
    priceOptionIndex: 0,
  };
  const itemOn: PlanCartItem = {
    ...itemOff,
    usePackagePeriod: true,
    lineCampaignDays: 3,
  };
  const periodCtx = { weeks: 1 };
  const off = planCartLinePeriodTotalWon(itemOff, packageMedia, periodCtx, true);
  const on = planCartLinePeriodTotalWon(itemOn, packageMedia, periodCtx, true);
  const wizardOff = buildQuoteWizardLineContext(packageMedia, {
    isKo: true,
    campaignPeriod: "7days",
    campaignPeriodLabel: "7days",
    priceOptionIndex: 0,
    usePackagePeriod: false,
  });
  const wizardOn = buildQuoteWizardLineContext(packageMedia, {
    isKo: true,
    campaignPeriod: "7days",
    campaignPeriodLabel: "7days",
    priceOptionIndex: 0,
    usePackagePeriod: true,
  });
  assert.equal(off, Math.round(wizardOff.lineTotalMan * 10_000));
  assert.equal(on, Math.round(wizardOn.lineTotalMan * 10_000));
  assert.ok(off > on);
  assert.equal(on, 5_000_000);
});
