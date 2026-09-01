import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalCatalogMediaType,
  isCatalogDoohType,
  getLegacyCatalogMediaTypeAliasHitCount,
  isValidCatalogMediaType,
  normalizeCatalogMediaType,
} from "./catalog-media-type.ts";

describe("catalog-media-type", () => {
  it("accepts canonical dooh", () => {
    assert.equal(isValidCatalogMediaType("dooh"), true);
    assert.equal(isValidCatalogMediaType("digital"), false);
  });

  it("maps legacy digital alias to dooh at parse boundary", () => {
    assert.equal(normalizeCatalogMediaType("digital"), "dooh");
    assert.equal(canonicalCatalogMediaType("digital"), "dooh");
    assert.equal(isCatalogDoohType("digital"), true);
    assert.ok(getLegacyCatalogMediaTypeAliasHitCount() >= 3);
  });

  it("leaves static and mobile unchanged", () => {
    assert.equal(normalizeCatalogMediaType("static"), "static");
    assert.equal(normalizeCatalogMediaType("mobile"), "mobile");
  });
});
