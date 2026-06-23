import assert from "node:assert/strict";
import {
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

console.log("network-taxonomy: ok");
