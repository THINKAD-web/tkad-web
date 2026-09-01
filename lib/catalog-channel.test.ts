import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalCatalogChannel,
  CATALOG_CHANNEL_OFFLINE,
  CATALOG_CHANNEL_ONLINE,
  isValidCatalogChannel,
  normalizeCatalogChannel,
  getNullMainCatalogChannelFallbackHitCount,
  resolveCatalogChannelForMediaWrite,
} from "./catalog-channel.ts";

test("catalog channel SSOT", () => {
  assert.equal(isValidCatalogChannel("offline"), true);
  assert.equal(isValidCatalogChannel("online"), true);
  assert.equal(isValidCatalogChannel("digital"), false);
  assert.equal(normalizeCatalogChannel(" OFFLINE "), CATALOG_CHANNEL_OFFLINE);
  assert.equal(normalizeCatalogChannel("bogus"), null);
  assert.equal(canonicalCatalogChannel(null), CATALOG_CHANNEL_OFFLINE);
  assert.equal(canonicalCatalogChannel("online"), CATALOG_CHANNEL_ONLINE);
});

test("resolveCatalogChannelForMediaWrite", () => {
  const hitsBefore = getNullMainCatalogChannelFallbackHitCount();
  assert.equal(
    resolveCatalogChannelForMediaWrite({}),
    CATALOG_CHANNEL_OFFLINE,
  );
  assert.equal(
    getNullMainCatalogChannelFallbackHitCount(),
    hitsBefore + 1,
  );
  assert.equal(
    resolveCatalogChannelForMediaWrite({ mediaMainCategory: null }),
    CATALOG_CHANNEL_OFFLINE,
  );
  assert.equal(
    resolveCatalogChannelForMediaWrite({ mediaMainCategory: "ooh" }),
    CATALOG_CHANNEL_OFFLINE,
  );
  assert.equal(
    resolveCatalogChannelForMediaWrite({ mediaMainCategory: "search" }),
    CATALOG_CHANNEL_ONLINE,
  );
  assert.equal(
    resolveCatalogChannelForMediaWrite({
      catalogChannel: "online",
      mediaMainCategory: "ooh",
    }),
    CATALOG_CHANNEL_ONLINE,
  );
});
