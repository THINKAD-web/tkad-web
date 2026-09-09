import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterOnlineCatalog } from "@/lib/admin-campaign-builder/filter-online-catalog";
import type { PublicMediaView } from "@/lib/digital/public-media-types";

const sample: PublicMediaView = {
  slug: "ig-awareness-reach",
  nameKo: "인스타그램 인지도",
  nameEn: "IG Awareness",
  channel: "INSTAGRAM",
  objective: "AWARENESS",
  mediaType: "SNS",
  platform: "Meta Instagram",
  billingType: ["CPM"],
  cpcMin: null,
  cpcMax: null,
  cpmMin: 4_000,
  cpmMax: 8_000,
  minBudget: 800_000,
  monthlyBudgetMin: 800_000,
  monthlyBudgetMax: 8_000_000,
  descriptionKo: "인스타 인지도 캠페인",
  descriptionEn: "IG awareness",
  featuresKo: [],
  kpiHintsKo: [],
  fitIndustries: [],
  fitGoals: [],
  ageTargets: [],
  genderTarget: null,
  interests: [],
  geoTargeting: [],
  audienceSize: null,
  strengths: [],
  idealFor: [],
  verified: true,
  isPromotion: false,
  mediaKitUrl: null,
  logoUrl: null,
  sourceNote: null,
  sortOrder: 10,
};

describe("filterOnlineCatalog", () => {
  it("filters by mediaType exact match", () => {
    const other = { ...sample, slug: "naver-sa", mediaType: "SA" as const };
    const filtered = filterOnlineCatalog([sample, other], { mediaType: "SNS" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.slug, sample.slug);
  });

  it("filters by q on name and description (case insensitive)", () => {
    const filtered = filterOnlineCatalog([sample], { q: "인스타" });
    assert.equal(filtered.length, 1);

    const none = filterOnlineCatalog([sample], { q: "틱톡" });
    assert.equal(none.length, 0);
  });
});
