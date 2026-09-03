import assert from "node:assert/strict";
import test from "node:test";
import {
  hasOnlinePricingSpec,
  isOfflineUnpriceableMedia,
  isOnlineCatalogMedia,
  isPricingUnavailable,
  isPublicQuoteWizardSelectableMedia,
  isQuoteWizardSelectableMedia,
  isQuoteWizardVisibleMedia,
  quoteWizardSelectBlockedMessage,
} from "@/lib/pricing-unavailable";

const offlineDooh = {
  id: "offline-dooh-test",
  catalogChannel: "offline",
  type: "dooh",
  price: 7_000_000,
  catalogSource: "media" as const,
  networkMinUnits: undefined,
  priceOptions: undefined,
  pricePeriod: "month" as const,
};

const onlineInquiry = {
  catalogChannel: "online",
  type: null,
  price: null,
  catalogSource: undefined,
  networkMinUnits: undefined,
  priceOptions: undefined,
  pricePeriod: undefined,
};

const onlineCalculable = {
  ...onlineInquiry,
  onlineSpec: {
    platform: "Meta Instagram",
    minBudget: 500_000,
    cpcMin: null,
    cpcMax: null,
    cpmMin: 4_000,
    cpmMax: 12_000,
  },
};

test("isOnlineCatalogMedia detects online channel", () => {
  assert.equal(isOnlineCatalogMedia(onlineInquiry), true);
  assert.equal(isOnlineCatalogMedia(offlineDooh), false);
});

test("hasOnlinePricingSpec — online with CPC/CPM", () => {
  assert.equal(hasOnlinePricingSpec(onlineInquiry), false);
  assert.equal(hasOnlinePricingSpec(onlineCalculable), true);
});

test("isPricingUnavailable — online without onlineSpec stays unavailable", () => {
  assert.equal(isPricingUnavailable(onlineInquiry), true);
});

test("isPricingUnavailable — online with rates + onlineSpec is available", () => {
  assert.equal(isPricingUnavailable(onlineCalculable), false);
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
  assert.equal(isOfflineUnpriceableMedia(onlineInquiry), false);
});

test("PR5-b commit 1 — visible vs selectable gates diverge for online", () => {
  assert.equal(isQuoteWizardVisibleMedia(onlineInquiry), true);
  assert.equal(isQuoteWizardVisibleMedia(onlineCalculable), true);
  assert.equal(isQuoteWizardVisibleMedia(offlineDooh), true);
  assert.equal(isQuoteWizardSelectableMedia(onlineInquiry), false);
  assert.equal(isQuoteWizardSelectableMedia(onlineCalculable), false);
  assert.equal(isQuoteWizardSelectableMedia(offlineDooh), true);
  assert.equal(isPublicQuoteWizardSelectableMedia(onlineInquiry), false);
  assert.equal(isPublicQuoteWizardSelectableMedia(onlineCalculable), true);
  assert.equal(isPublicQuoteWizardSelectableMedia(offlineDooh), true);
});

test("quoteWizardSelectBlockedMessage — inquiry online only", () => {
  assert.match(quoteWizardSelectBlockedMessage(onlineInquiry, true), /가격 문의/);
});
