import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBunnyMediaProxyUrl,
  bunnyCdnToProxyFallback,
  bunnyObjectPathFromPublicUrl,
  decodeBunnyPathSegments,
  encodeBunnyProxyPathSegments,
  resolveCatalogImageSrc,
  resolvePublicMediaImageUrl,
  shouldUseUnoptimizedImage,
} from "./optimized-image-url";

const SAMPLE_CDN =
  "https://tkad-cdn.b-cdn.net/tkad/Test/tkad_impress.png";

/** NFD 한글 파일명 (macOS/업로드에서 흔한 형태) */
const NFD_NAME = "강남".normalize("NFD");
const SPACE_NAME = "foo bar.jpg";

function withBunnyEnv(fn: () => void) {
  const previousZone = process.env.BUNNY_STORAGE_ZONE;
  const previousKey = process.env.BUNNY_STORAGE_API_KEY;
  const previousCdn = process.env.BUNNY_CDN_BASE_URL;

  process.env.BUNNY_STORAGE_ZONE = "tkad";
  process.env.BUNNY_STORAGE_API_KEY = "test-key";
  process.env.BUNNY_CDN_BASE_URL = "https://tkad-cdn.b-cdn.net";

  try {
    fn();
  } finally {
    if (previousZone === undefined) delete process.env.BUNNY_STORAGE_ZONE;
    else process.env.BUNNY_STORAGE_ZONE = previousZone;
    if (previousKey === undefined) delete process.env.BUNNY_STORAGE_API_KEY;
    else process.env.BUNNY_STORAGE_API_KEY = previousKey;
    if (previousCdn === undefined) delete process.env.BUNNY_CDN_BASE_URL;
    else process.env.BUNNY_CDN_BASE_URL = previousCdn;
  }
}

/** App Router `[...path]`가 프록시 URL을 디코딩한 뒤 라우트가 복원하는 object path */
function proxyUrlToStorageObjectPath(proxyUrl: string): string {
  assert.ok(proxyUrl.startsWith("/api/bunny-media/"));
  const encodedPath = proxyUrl.slice("/api/bunny-media/".length);
  return decodeBunnyPathSegments(encodedPath.split("/")).join("/");
}

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
  withBunnyEnv(() => {
    assert.equal(
      bunnyCdnToProxyFallback(SAMPLE_CDN),
      "/api/bunny-media/tkad/Test/tkad_impress.png",
    );
    assert.equal(
      bunnyCdnToProxyFallback("/api/bunny-media/tkad/foo.jpg"),
      null,
    );
  });
});

test("buildBunnyMediaProxyUrl: ASCII — no double encoding, storage round-trip", () => {
  withBunnyEnv(() => {
    const proxy = buildBunnyMediaProxyUrl(SAMPLE_CDN);
    assert.equal(proxy, "/api/bunny-media/tkad/Test/tkad_impress.png");
    assert.ok(proxy && !proxy.includes("%25"), "must not double-encode");
    assert.equal(
      proxyUrlToStorageObjectPath(proxy!),
      "tkad/Test/tkad_impress.png",
    );
  });
});

test("buildBunnyMediaProxyUrl: NFD Korean filename — single encode + round-trip", () => {
  withBunnyEnv(() => {
    const file = `${NFD_NAME}.jpg`;
    const cdn = `https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/${encodeURIComponent(file)}`;
    // URL() normalizes pathname encoding
    const href = new URL(cdn).href;
    const pathFromUrl = bunnyObjectPathFromPublicUrl(href);
    assert.ok(pathFromUrl);

    const proxy = buildBunnyMediaProxyUrl(href);
    assert.ok(proxy);
    assert.ok(!proxy!.includes("%25"), `double-encoded: ${proxy}`);
    // 단일 인코딩: 파일명 세그먼트에 %가 있으면 %XX 한 겹만
    const fileSeg = proxy!.split("/").pop()!;
    assert.ok(fileSeg.includes("%"), "Korean segment should be percent-encoded");
    assert.equal(fileSeg, encodeURIComponent(file));

    const storageKey = proxyUrlToStorageObjectPath(proxy!);
    assert.equal(storageKey, `tkad/admin/2026/05/${file}`);
    assert.equal(storageKey.normalize("NFD"), storageKey);
  });
});

test("buildBunnyMediaProxyUrl: space in filename — single encode + round-trip", () => {
  withBunnyEnv(() => {
    const cdn = `https://tkad-cdn.b-cdn.net/tkad/Test/${encodeURIComponent(SPACE_NAME)}`;
    const href = new URL(cdn).href;
    const proxy = buildBunnyMediaProxyUrl(href);
    assert.ok(proxy);
    assert.ok(!proxy!.includes("%25"), `double-encoded: ${proxy}`);
    assert.equal(
      proxyUrlToStorageObjectPath(proxy!),
      `tkad/Test/${SPACE_NAME}`,
    );
    assert.ok(
      proxy!.endsWith(encodeURIComponent(SPACE_NAME)) ||
        proxy!.includes("foo%20bar.jpg"),
    );
  });
});

test("encode/decode Bunny proxy segments are inverses", () => {
  const decoded = ["tkad", "Test", NFD_NAME + ".jpg", SPACE_NAME];
  const encoded = encodeBunnyProxyPathSegments(decoded);
  assert.ok(!encoded.includes("%25"));
  assert.deepEqual(decodeBunnyPathSegments(encoded.split("/")), decoded);
});
