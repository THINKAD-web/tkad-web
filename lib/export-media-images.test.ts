import test from "node:test";
import assert from "node:assert/strict";
import {
  PROPOSAL_GALLERY_JPEG_QUALITY,
  PROPOSAL_HERO_JPEG_QUALITY,
  PROPOSAL_HERO_PIXELS,
  EXPORT_THUMB_PIXELS,
  coverCropImageDataUrl,
  dataUrlImageFormat,
} from "@/lib/export-media-images.ts";

function dataUrlFromBuffer(buf: Buffer, mime: string): string {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

// 1×1 JPEG (magic ff d8)
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
  "base64",
);

// 1×1 PNG (magic 89 50)
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// Minimal RIFF WEBP (VP8 lossy 1×1)
const TINY_WEBP = Buffer.from(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/vuUAAA=",
  "base64",
);

test("dataUrlImageFormat — JPEG magic bytes override wrong data: prefix", () => {
  const d = dataUrlFromBuffer(TINY_JPEG, "image/png");
  assert.equal(dataUrlImageFormat(d), "JPEG");
});

test("dataUrlImageFormat — PNG magic bytes override wrong data: prefix", () => {
  const d = dataUrlFromBuffer(TINY_PNG, "image/jpeg");
  assert.equal(dataUrlImageFormat(d), "PNG");
});

test("dataUrlImageFormat — WEBP magic bytes override wrong data: prefix", () => {
  const d = dataUrlFromBuffer(TINY_WEBP, "image/jpeg");
  assert.equal(dataUrlImageFormat(d), "WEBP");
});

test("coverCropImageDataUrl — hero 16:9 JPEG output", async () => {
  const input = dataUrlFromBuffer(TINY_PNG, "image/png");
  const out = await coverCropImageDataUrl(input, {
    width: PROPOSAL_HERO_PIXELS.w,
    height: PROPOSAL_HERO_PIXELS.h,
    quality: PROPOSAL_HERO_JPEG_QUALITY,
  });
  assert.match(out, /^data:image\/jpeg;base64,/);
  assert.equal(dataUrlImageFormat(out), "JPEG");

  const sharp = (await import("sharp")).default;
  const meta = await sharp(Buffer.from(out.split(",", 2)[1]!, "base64")).metadata();
  assert.equal(meta.width, PROPOSAL_HERO_PIXELS.w);
  assert.equal(meta.height, PROPOSAL_HERO_PIXELS.h);
  assert.equal(meta.format, "jpeg");
});

test("coverCropImageDataUrl — gallery 4:3 JPEG output", async () => {
  const input = dataUrlFromBuffer(TINY_WEBP, "image/webp");
  const out = await coverCropImageDataUrl(input, {
    width: EXPORT_THUMB_PIXELS.w,
    height: EXPORT_THUMB_PIXELS.h,
    quality: PROPOSAL_GALLERY_JPEG_QUALITY,
  });
  assert.match(out, /^data:image\/jpeg;base64,/);
  assert.equal(dataUrlImageFormat(out), "JPEG");

  const sharp = (await import("sharp")).default;
  const meta = await sharp(Buffer.from(out.split(",", 2)[1]!, "base64")).metadata();
  assert.equal(meta.width, EXPORT_THUMB_PIXELS.w);
  assert.equal(meta.height, EXPORT_THUMB_PIXELS.h);
  assert.equal(meta.format, "jpeg");
});
