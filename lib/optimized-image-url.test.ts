import assert from "node:assert/strict";
import test from "node:test";
import {
  bunnyCdnToProxyFallback,
  resolveCatalogImageSrc,
  resolvePublicMediaImageUrl,
  shouldUseUnoptimizedImage,
} from "./optimized-image-url";

const SAMPLE_CDN =
  "https://tkad-cdn.b-cdn.net/tkad/Test/tkad_impress.png";

test("resolvePublicMediaImageUrl returns Bunny CDN as-is (no proxy)", () => {
  assert.equal(resolvePublicMediaImageUrl(SAMPLE_CDN), SAMPLE_CDN);
  assert.equal(
    resolvePublicMediaImageUrl("tkad-cdn.b-cdn.net/tkad/foo.jpg"),
    "https://tkad-cdn.b-cdn.net/tkad/foo.jpg",
  );
});

test("resolveCatalogImageSrc — Strategy A: CDN + unoptimized", () => {
  const resolved = resolveCatalogImageSrc(SAMPLE_CDN);
  assert.deepEqual(resolved, {
    src: SAMPLE_CDN,
    unoptimized: true,
  });
});

test("shouldUseUnoptimizedImage for Bunny CDN and proxy paths", () => {
  assert.equal(shouldUseUnoptimizedImage(SAMPLE_CDN), true);
  assert.equal(
    shouldUseUnoptimizedImage("/api/bunny-media/tkad%2Ffoo.jpg"),
    true,
  );
  assert.equal(shouldUseUnoptimizedImage("/images/hero/slide.webp"), false);
});

test("bunnyCdnToProxyFallback builds proxy from CDN URL", () => {
  const previousZone = process.env.BUNNY_STORAGE_ZONE;
  const previousKey = process.env.BUNNY_STORAGE_API_KEY;
  const previousCdn = process.env.BUNNY_CDN_BASE_URL;

  process.env.BUNNY_STORAGE_ZONE = "tkad";
  process.env.BUNNY_STORAGE_API_KEY = "test-key";
  process.env.BUNNY_CDN_BASE_URL = "https://tkad-cdn.b-cdn.net";

  try {
    assert.equal(
      bunnyCdnToProxyFallback(SAMPLE_CDN),
      "/api/bunny-media/tkad/Test/tkad_impress.png",
    );
    assert.equal(
      bunnyCdnToProxyFallback("/api/bunny-media/tkad/foo.jpg"),
      null,
    );
  } finally {
    if (previousZone === undefined) delete process.env.BUNNY_STORAGE_ZONE;
    else process.env.BUNNY_STORAGE_ZONE = previousZone;
    if (previousKey === undefined) delete process.env.BUNNY_STORAGE_API_KEY;
    else process.env.BUNNY_STORAGE_API_KEY = previousKey;
    if (previousCdn === undefined) delete process.env.BUNNY_CDN_BASE_URL;
    else process.env.BUNNY_CDN_BASE_URL = previousCdn;
  }
});
