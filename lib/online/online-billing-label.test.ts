import assert from "node:assert/strict";
import test from "node:test";
import { onlineBillingTypeLabel } from "@/lib/online/online-billing-label";

const calculableSpec = {
  platform: "Google Ads Search",
  minBudget: 1_000_000,
  cpcMin: 100,
  cpcMax: 500,
  cpmMin: 3_000,
  cpmMax: 8_000,
};

test("onlineBillingTypeLabel — calculable derives CPC · CPM from rates", () => {
  assert.equal(
    onlineBillingTypeLabel(calculableSpec, "google-ads-search", true),
    "CPC · CPM",
  );
});

test("onlineBillingTypeLabel — baemin mixed billing from slug override", () => {
  assert.equal(
    onlineBillingTypeLabel(
      { platform: "Baemin", minBudget: 600_000, cpcMin: null, cpcMax: null, cpmMin: null, cpmMax: null },
      "baemin-ad-visit",
      true,
    ),
    "CPC · 정률 · 정액",
  );
});

test("onlineBillingTypeLabel — kakao message CPMS not CPC", () => {
  assert.equal(
    onlineBillingTypeLabel(
      { platform: "Kakao Moment", minBudget: 500_000, cpcMin: null, cpcMax: null, cpmMin: null, cpmMax: null },
      "kakao-moment-message",
      true,
    ),
    "CPMS",
  );
});

test("onlineBillingTypeLabel — naver brand search flat fee", () => {
  assert.equal(
    onlineBillingTypeLabel(
      { platform: "Naver Brand Search", minBudget: 3_000_000, cpcMin: null, cpcMax: null, cpmMin: null, cpmMax: null },
      "naver-brand-search",
      true,
    ),
    "정액",
  );
});

test("onlineBillingTypeLabel — inquiry without slug override", () => {
  assert.equal(
    onlineBillingTypeLabel(null, undefined, true),
    "문의",
  );
});
