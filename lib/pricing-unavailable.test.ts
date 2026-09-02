import assert from "node:assert/strict";
import test from "node:test";
import {
  isOfflineUnpriceableMedia,
  isOnlineCatalogMedia,
  isPricingUnavailable,
} from "@/lib/pricing-unavailable";
import type { MediaItem } from "@/lib/media-data";

const offlineDooh = {
  id: "offline-dooh-test",
  catalogChannel: "offline",
  type: "dooh",
  price: 7_000_000,
  catalogSource: "media" as const,
  networkMinUnits: undefined,
  priceOptions: undefined,
  pricePeriod: "month" as const,
} satisfies PricingUnavailableMedia & { id: string };

type PricingUnavailableMedia = Parameters<typeof isPricingUnavailable>[0];

const onlineRow = {
  catalogChannel: "online",
  type: null,
  price: null,
  catalogSource: undefined,
  networkMinUnits: undefined,
  priceOptions: undefined,
  pricePeriod: undefined,
} satisfies PricingUnavailableMedia;

test("isOnlineCatalogMedia detects online channel", () => {
  assert.equal(isOnlineCatalogMedia(onlineRow), true);
  assert.equal(isOnlineCatalogMedia(offlineDooh), false);
});

test("isPricingUnavailable — online always unavailable", () => {
  assert.equal(isPricingUnavailable(onlineRow), true);
});

test("isPricingUnavailable — offline billable is available", () => {
  assert.equal(isPricingUnavailable(offlineDooh), false);
});

test("isPricingUnavailable — offline null type is unavailable", () => {
  assert.equal(
    isPricingUnavailable({ ...offlineDooh, type: null, price: null }),
    true,
  );
});

test("isOfflineUnpriceableMedia ignores online rows", () => {
  assert.equal(isOfflineUnpriceableMedia(onlineRow), false);
});
