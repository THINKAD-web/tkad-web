import assert from "node:assert/strict";
import test from "node:test";
import {
  applyGalleryUrlsToFormParts,
  dedupeUrlsPreserveOrder,
  galleryUrlsFromFormParts,
  imageFieldsForApiBody,
  mergePrimaryAndExtracted,
  splitPrimaryAndExtracted,
} from "./admin-media-gallery-urls";

test("dedupeUrlsPreserveOrder keeps first occurrence", () => {
  assert.deepEqual(dedupeUrlsPreserveOrder(["a", "b", "a", " c ", ""]), [
    "a",
    "b",
    "c",
  ]);
});

test("mergePrimaryAndExtracted puts cover first and strips dups", () => {
  assert.deepEqual(mergePrimaryAndExtracted("a", ["a", "b", "c"]), [
    "a",
    "b",
    "c",
  ]);
  assert.deepEqual(mergePrimaryAndExtracted(null, ["x", "y"]), ["x", "y"]);
});

test("imageFieldsForApiBody never drops unique URLs when stripping primary", () => {
  const body = imageFieldsForApiBody("a", "a\nb\nc");
  assert.equal(body.image, "a");
  assert.deepEqual(body.extractedImages, ["b", "c"]);
});

test("imageFieldsForApiBody keeps cover when gallery omits it", () => {
  const body = imageFieldsForApiBody("cover", "b\nc");
  assert.equal(body.image, "cover");
  assert.deepEqual(body.extractedImages, ["b", "c"]);
});

test("idle save on primary-in-extracted does not wipe both", () => {
  const before = mergePrimaryAndExtracted("p", ["p", "e1", "e2"]);
  assert.equal(before.length, 3);
  const { image, extractedImages } = splitPrimaryAndExtracted(before);
  assert.equal(image, "p");
  assert.deepEqual(extractedImages, ["e1", "e2"]);
  assert.deepEqual(mergePrimaryAndExtracted(image, extractedImages), before);
});

test("gallery form round-trip", () => {
  const urls = galleryUrlsFromFormParts("a", "b\nc");
  assert.deepEqual(urls, ["a", "b", "c"]);
  const parts = applyGalleryUrlsToFormParts(urls);
  assert.equal(parts.image, "a");
  assert.equal(parts.extractedImagesText, "b\nc");
});
