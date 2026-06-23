import assert from "node:assert/strict";
import {
  inferNetworkVenueFromHaystack,
  inferTargetSlugsFromHaystack,
  networkTaxonomyFromRow,
  networkTaxonomyToPatch,
  parseTargetSlugsFromTags,
  resolveNetworkBrowseForPublic,
  resolveNetworkTargetForPublic,
  suggestBrowseFromVenue,
  syncNetworkTagsWithTaxonomy,
} from "../lib/network-taxonomy.ts";

assert.deepEqual(suggestBrowseFromVenue("convenience_store"), {
  main: "network",
  sub: "convenience_network",
});

const form = networkTaxonomyFromRow({
  type: "bus_shelter",
  tags: ["venue:bus_shelter"],
  name: "강남 버스",
});
assert.equal(form.catalogType, "mobile");
assert.equal(form.venueCode, "bus_shelter");
assert.ok(form.browseMain);

const patch = networkTaxonomyToPatch(
  {
    catalogType: "mobile",
    venueCode: "bus_shelter",
    browseMain: "shelter",
    browseSub: "bus_shelter",
    regionMain: "seoul",
    regionSub: "seoul_gangnam",
    targetSlugs: ["brand"],
  },
  ["misc"],
);
assert.equal(patch.type, "mobile");
assert.equal(patch.venueType, "bus_shelter");
assert.ok(patch.tags.includes("venue:bus_shelter"));
assert.ok(patch.tags.includes("target:brand"));
assert.ok(patch.tags.includes("misc"));

const pub = resolveNetworkBrowseForPublic({
  type: "digital",
  mediaMainCategory: "network",
  mediaSubCategory: "convenience_network",
  tags: [],
});
assert.equal(pub.mediaMainCategory, "network");

const targets = resolveNetworkTargetForPublic({
  targetCategory: ["fandom"],
  tags: [],
});
assert.deepEqual(targets, ["fandom"]);

assert.deepEqual(parseTargetSlugsFromTags(["target:brand", "foo"]), ["brand"]);

// Haystack venue inference (명시 venue:* 없을 때)
assert.equal(
  inferNetworkVenueFromHaystack({
    name: "헬로미디어 병원",
    tags: ["병원 DOOH"],
  }),
  "hospital",
);
assert.equal(
  inferNetworkVenueFromHaystack({ name: "약국 와이드", tags: ["약국"] }),
  "pharmacy",
);
assert.equal(
  inferNetworkVenueFromHaystack({ name: "교보문고", tags: ["서점"] }),
  "bookstore",
);
assert.equal(
  inferNetworkVenueFromHaystack({ name: "어시스트핏 헬스장", tags: ["헬스"] }),
  "gym",
);
assert.equal(
  inferNetworkVenueFromHaystack({
    name: "대학교 캠퍼스 키오스크",
    tags: ["대학 키오스크"],
  }),
  "campus_kiosk",
);

// Haystack target inference (brand 기본값 없음, venue 컨텍스트 반영)
assert.deepEqual(
  inferTargetSlugsFromHaystack({
    tags: ["직장인", "고소득", "B2B/B2C"],
    venueCode: "office",
  }),
  ["brand"],
);
assert.deepEqual(
  inferTargetSlugsFromHaystack({ tags: ["2030 타겟", "자기관리"] }),
  [],
);
assert.deepEqual(
  inferTargetSlugsFromHaystack({
    tags: ["학생 타겟", "대학생"],
    venueCode: "campus_kiosk",
  }),
  ["university"],
);
assert.deepEqual(
  inferTargetSlugsFromHaystack({
    tags: ["환자 보호자 타겟"],
    venueCode: "hospital",
  }),
  ["regional"],
);
assert.deepEqual(
  inferTargetSlugsFromHaystack({
    tags: ["5060 타겟", "건강 타겟", "의약품 광고"],
    venueCode: "pharmacy",
  }),
  ["regional", "small_business"],
);

assert.deepEqual(suggestBrowseFromVenue("pharmacy"), {
  main: "building",
  sub: "hospital",
});
assert.deepEqual(suggestBrowseFromVenue("bookstore"), {
  main: "education",
  sub: "library",
});

// Full row: venue browse not ooh/digital_signage when venue inferred
const hospitalForm = networkTaxonomyFromRow({
  type: "digital",
  name: "헬로미디어 병원",
  tags: ["병원 DOOH", "환자 보호자 타겟"],
  targetCategory: [],
});
assert.equal(hospitalForm.venueCode, "hospital");
assert.equal(hospitalForm.browseMain, "network");
assert.equal(hospitalForm.browseSub, "hospital_network");
assert.deepEqual(hospitalForm.targetSlugs, ["regional"]);

const pharmacyForm = networkTaxonomyFromRow({
  type: "digital",
  name: "약국 와이드",
  tags: ["5060 타겟", "건강 타겟", "의약품 광고"],
  targetCategory: [],
});
assert.equal(pharmacyForm.venueCode, "pharmacy");
assert.equal(pharmacyForm.browseMain, "building");
assert.equal(pharmacyForm.browseSub, "hospital");
assert.ok(pharmacyForm.targetSlugs.includes("regional"));
assert.ok(!pharmacyForm.targetSlugs.includes("brand"));

const targetsFromHaystack = resolveNetworkTargetForPublic({
  targetCategory: [],
  tags: ["5060", "건강 타겟", "의약품"],
  name: "약국",
  type: "digital",
});
assert.ok(targetsFromHaystack?.includes("regional"));
assert.ok(!targetsFromHaystack?.includes("brand"));

console.log("network-taxonomy: ok");
