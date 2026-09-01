import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertAllProposalEligible,
  evaluateProposalCandidate,
  isNetworkCatalogId,
} from "./candidate-filter";

const airportOk = {
  id: "media_t1_kiro",
  name: "인천공항 국제선 T1 키로뷰 광고",
  isActive: true,
  reviewStatus: "clean",
  type: "dooh",
  mediaSubCategory: "airport",
  price: 12_000_000,
  impressions: 2_200_000,
  dailyFootfall: 80_000,
};

test("flagged media is excluded even when CPM is in bounds", () => {
  const d = evaluateProposalCandidate({
    ...airportOk,
    reviewStatus: "flagged",
  });
  assert.equal(d.eligible, false);
  assert.ok(d.reasons.includes("flagged"));
});

test("airport CPM below class bounds is excluded", () => {
  const d = evaluateProposalCandidate({
    ...airportOk,
    name: "인천국제공항 키로뷰 Full Package 광고",
    price: 20_000_000,
    impressions: 4_500_000,
  });
  assert.equal(d.eligible, false);
  assert.ok(d.reasons.includes("cpm_class_bounds"));
  assert.equal(d.mediaClass, "airport");
});

test("in-bounds airport CPM is eligible", () => {
  const d = evaluateProposalCandidate(airportOk);
  assert.equal(d.eligible, true);
  assert.deepEqual(d.reasons, []);
  assert.ok(d.cpmWon != null && d.cpmWon >= 5000 && d.cpmWon <= 45000);
});

test("sellingUnit undeclared does not exclude", () => {
  const d = evaluateProposalCandidate({
    ...airportOk,
    id: "media_t2_kiro",
    name: "인천공항 국제선 T2 키로뷰 광고",
    priceNote: null,
    description: null,
  });
  assert.equal(d.eligible, true);
  assert.equal(d.sellingUnitUndeclared, true);
});

test("uncomputable CPM is excluded", () => {
  const d = evaluateProposalCandidate({
    ...airportOk,
    price: 0,
    impressions: null,
    dailyFootfall: null,
    cpm: null,
  });
  assert.equal(d.eligible, false);
  assert.ok(d.reasons.includes("cpm_uncomputable"));
});

test("network catalog ids cannot enter the pool", () => {
  assert.equal(isNetworkCatalogId("nw_abc"), true);
  const d = evaluateProposalCandidate({
    ...airportOk,
    id: "nw_rest_stop_pack",
  });
  assert.equal(d.eligible, false);
  assert.ok(d.reasons.includes("network_catalog"));
});

test("assertAllProposalEligible throws on leak", () => {
  assert.throws(
    () =>
      assertAllProposalEligible([
        { ...airportOk, reviewStatus: "flagged" },
      ]),
    /PROPOSAL_FILTER_LEAK/,
  );
  assert.doesNotThrow(() => assertAllProposalEligible([airportOk]));
});
