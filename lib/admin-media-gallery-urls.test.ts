import assert from "node:assert/strict";
import test from "node:test";
import {
  applyGalleryUrlsToFormParts,
  dedupeUrlsPreserveOrder,
  galleryFormSnapshot,
  galleryFormSnapshotTouched,
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

test("galleryFormSnapshotTouched — null initial means POST (always touched)", () => {
  const snap = galleryFormSnapshot("a", "b");
  assert.equal(galleryFormSnapshotTouched(snap, null), true);
});

test("galleryFormSnapshotTouched — unchanged gallery is not touched", () => {
  const initial = galleryFormSnapshot("cover", "e1\ne2");
  assert.equal(galleryFormSnapshotTouched(initial, initial), false);
});

test("galleryFormSnapshotTouched — name-only edit leaves gallery untouched", () => {
  const initial = galleryFormSnapshot("cover", "e1\ne2");
  const current = galleryFormSnapshot("cover", "e1\ne2");
  assert.equal(galleryFormSnapshotTouched(current, initial), false);
});

test("galleryFormSnapshotTouched — reorder or edit marks touched", () => {
  const initial = galleryFormSnapshot("a", "b\nc");
  assert.equal(
    galleryFormSnapshotTouched(galleryFormSnapshot("a", "c\nb"), initial),
    true,
  );
  assert.equal(
    galleryFormSnapshotTouched(galleryFormSnapshot("b", "a\nc"), initial),
    true,
  );
});
