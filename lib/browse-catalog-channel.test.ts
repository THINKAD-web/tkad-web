import assert from "node:assert/strict";
import test from "node:test";
import {
  CATALOG_CHANNEL_OFFLINE,
  CATALOG_CHANNEL_ONLINE,
} from "./catalog-channel.ts";
import {
  resolveBrowseCatalogChannelFilter,
  sanitizeBrowseMainForChannel,
} from "./browse-catalog-channel.ts";

test("resolveBrowseCatalogChannelFilter — online route always online", () => {
  assert.equal(
    resolveBrowseCatalogChannelFilter({
      browseChannel: "online",
      mainCategory: null,
    }),
    CATALOG_CHANNEL_ONLINE,
  );
  assert.equal(
    resolveBrowseCatalogChannelFilter({
      browseChannel: "online",
      mainCategory: "search",
    }),
    CATALOG_CHANNEL_ONLINE,
  );
});

test("resolveBrowseCatalogChannelFilter — offline default is offline-only", () => {
  assert.equal(
    resolveBrowseCatalogChannelFilter({
      browseChannel: "offline",
      mainCategory: null,
    }),
    CATALOG_CHANNEL_OFFLINE,
  );
  assert.equal(
    resolveBrowseCatalogChannelFilter({
      browseChannel: "offline",
      mainCategory: "ooh",
    }),
    CATALOG_CHANNEL_OFFLINE,
  );
});

test("resolveBrowseCatalogChannelFilter — legacy online main on /media skips channel guard", () => {
  assert.equal(
    resolveBrowseCatalogChannelFilter({
      browseChannel: "offline",
      mainCategory: "search",
    }),
    null,
  );
  assert.equal(
    resolveBrowseCatalogChannelFilter({
      browseChannel: "offline",
      mainCategory: "local",
    }),
    null,
  );
});

test("sanitizeBrowseMainForChannel — online route rejects offline mains", () => {
  assert.equal(sanitizeBrowseMainForChannel("online", "search"), "search");
  assert.equal(sanitizeBrowseMainForChannel("online", "transit"), "");
  assert.equal(sanitizeBrowseMainForChannel("online", "ooh"), "");
});

test("sanitizeBrowseMainForChannel — offline route keeps legacy online mains", () => {
  assert.equal(sanitizeBrowseMainForChannel("offline", "search"), "search");
  assert.equal(sanitizeBrowseMainForChannel("offline", "ooh"), "ooh");
});
