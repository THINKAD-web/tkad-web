import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCatalogChannelInvariants,
  MEDIA_CATALOG_INVARIANT_VIOLATION,
  resolveMediaCatalogWriteShape,
} from "./media-catalog-invariants.ts";

test("offline requires display type and price", () => {
  const ok = applyCatalogChannelInvariants("offline", {
    type: "dooh",
    price: 0,
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.data.type, "dooh");
    assert.equal(ok.data.price, 0);
  }

  const noType = applyCatalogChannelInvariants("offline", {
    type: null,
    price: 100,
  });
  assert.equal(noType.ok, false);
  if (!noType.ok) {
    assert.match(noType.error, new RegExp(MEDIA_CATALOG_INVARIANT_VIOLATION));
  }
});

test("online requires type=null and price=null", () => {
  const ok = applyCatalogChannelInvariants("online", {
    type: null,
    price: null,
  });
  assert.equal(ok.ok, true);

  const withType = applyCatalogChannelInvariants("online", {
    type: "dooh",
    price: null,
  });
  assert.equal(withType.ok, false);

  const withPrice = applyCatalogChannelInvariants("online", {
    type: null,
    price: 100,
  });
  assert.equal(withPrice.ok, false);
});

test("resolveMediaCatalogWriteShape — online create", () => {
  const shape = resolveMediaCatalogWriteShape({
    catalogChannel: "online",
    typeRaw: "",
    priceRaw: null,
  });
  assert.equal(shape.ok, true);
  if (shape.ok) {
    assert.equal(shape.data.type, null);
    assert.equal(shape.data.price, null);
  }
});

test("resolveMediaCatalogWriteShape — offline create", () => {
  const shape = resolveMediaCatalogWriteShape({
    catalogChannel: "offline",
    typeRaw: "mobile",
    priceRaw: 3_000_000,
  });
  assert.equal(shape.ok, true);
  if (shape.ok) {
    assert.equal(shape.data.type, "mobile");
    assert.equal(shape.data.price, 3_000_000);
  }
});
