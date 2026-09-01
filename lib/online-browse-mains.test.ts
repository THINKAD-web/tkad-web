import assert from "node:assert/strict";
import test from "node:test";
import {
  isOnlineBrowseMain,
  isOfflineBrowseMain,
  normalizeBrowseMainId,
  ONLINE_BROWSE_MAIN_IDS,
} from "./online-browse-mains.ts";
import { resolveCatalogChannelFromBrowseMain } from "./catalog-channel-maps.ts";
import {
  CATALOG_CHANNEL_OFFLINE,
  CATALOG_CHANNEL_ONLINE,
} from "./catalog-channel.ts";
import { resolveBrowseCategoryParams } from "./media-browse-categories.ts";

test("online browse mains", () => {
  assert.equal(ONLINE_BROWSE_MAIN_IDS.length, 6);
  assert.equal(isOnlineBrowseMain("search"), true);
  assert.equal(isOnlineBrowseMain("local"), true);
  assert.equal(isOnlineBrowseMain("ooh"), false);
  assert.equal(normalizeBrowseMainId("digital"), null);
  assert.equal(normalizeBrowseMainId("search"), "search");
});

test("catalog channel from browse main", () => {
  assert.equal(resolveCatalogChannelFromBrowseMain("transit"), CATALOG_CHANNEL_OFFLINE);
  assert.equal(resolveCatalogChannelFromBrowseMain("video"), CATALOG_CHANNEL_ONLINE);
  assert.equal(resolveCatalogChannelFromBrowseMain("bogus"), null);
});

test("legacy browse URL params", () => {
  assert.deepEqual(
    resolveBrowseCategoryParams({ category: "digital" }),
    { mainCategory: null, subCategory: null },
  );
  assert.deepEqual(
    resolveBrowseCategoryParams({ mainCategory: "digital" }),
    { mainCategory: null, subCategory: null },
  );
  assert.deepEqual(
    resolveBrowseCategoryParams({ subCategory: "search_ad" }),
    { mainCategory: "search", subCategory: null },
  );
});
