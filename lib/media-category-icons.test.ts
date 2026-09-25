import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveMediaCategoryIconFromBrowseSub,
  resolveMediaCategoryIconFromMediaFields,
  resolveMediaCategoryIconFromTypeFilter,
} from "@/lib/media-category-icons";

test("type filter chips map to design assets", () => {
  assert.equal(resolveMediaCategoryIconFromTypeFilter("subway"), "subway");
  assert.equal(resolveMediaCategoryIconFromTypeFilter("bus"), "busWrap");
  assert.equal(resolveMediaCategoryIconFromTypeFilter("dooh"), "dooh");
});

test("browse sub ids map for home coverage tiles", () => {
  assert.equal(resolveMediaCategoryIconFromBrowseSub("subway_station"), "subway");
  assert.equal(resolveMediaCategoryIconFromBrowseSub("digital_signage"), "dooh");
  assert.equal(resolveMediaCategoryIconFromBrowseSub("bus_shelter"), "busShelter");
});

test("online catalog channel uses online ad icon", () => {
  assert.equal(
    resolveMediaCategoryIconFromMediaFields({ catalogChannel: "online" }),
    "onlineAd",
  );
});
