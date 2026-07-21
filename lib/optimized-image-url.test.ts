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

/** App Router `[...path]`가 프록시 URL을 디코딩한 뒤 라우트가 복원하는 object path */
function proxyUrlToStorageObjectPath(proxyUrl: string): string {
  assert.ok(proxyUrl.startsWith("/api/bunny-media/"));
  const encodedPath = proxyUrl.slice("/api/bunny-media/".length);
  return decodeBunnyPathSegments(encodedPath.split("/")).join("/");
}

/** 브라우저 번들처럼 BUNNY_* 비밀이 없는 환경을 시뮬레이션 */
function withoutBunnyEnv(fn: () => void) {
  const keys = [
    "BUNNY_STORAGE_ZONE",
    "BUNNY_STORAGE_API_KEY",
    "BUNNY_CDN_BASE_URL",
    "BUNNY_STORAGE_HOST",
  ] as const;
  const previous = Object.fromEntries(
    keys.map((k) => [k, process.env[k]]),
  ) as Record<(typeof keys)[number], string | undefined>;

  for (const k of keys) delete process.env[k];

  try {
    fn();
  } finally {
    for (const k of keys) {
      const v = previous[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
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

test("bunnyCdnToProxyFallback builds proxy without Bunny env (client-like)", () => {
  withoutBunnyEnv(() => {
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

test("buildBunnyMediaProxyUrl: ASCII — no gate, no double encoding", () => {
  withoutBunnyEnv(() => {
    const proxy = buildBunnyMediaProxyUrl(SAMPLE_CDN);
    assert.equal(proxy, "/api/bunny-media/tkad/Test/tkad_impress.png");
    assert.ok(proxy && !proxy.includes("%25"), "must not double-encode");
    assert.equal(
      proxyUrlToStorageObjectPath(proxy!),
      "tkad/Test/tkad_impress.png",
    );
  });
});

test("buildBunnyMediaProxyUrl: NFD Korean — single encode without Bunny env", () => {
  withoutBunnyEnv(() => {
    const file = `${NFD_NAME}.jpg`;
    const cdn = `https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/${encodeURIComponent(file)}`;
    const href = new URL(cdn).href;
    const pathFromUrl = bunnyObjectPathFromPublicUrl(href);
    assert.ok(pathFromUrl);

    const proxy = buildBunnyMediaProxyUrl(href);
    assert.ok(proxy, "must build proxy URL without storage credentials");
    assert.ok(!proxy!.includes("%25"), `double-encoded: ${proxy}`);
    const fileSeg = proxy!.split("/").pop()!;
    assert.ok(fileSeg.includes("%"), "Korean segment should be percent-encoded");
    assert.equal(fileSeg, encodeURIComponent(file));
    assert.ok(
      /%E1%84/i.test(fileSeg),
      "NFD Hangul should appear as single-encoded %E1%84…",
    );

    const storageKey = proxyUrlToStorageObjectPath(proxy!);
    assert.equal(storageKey, `tkad/admin/2026/05/${file}`);
    assert.equal(storageKey.normalize("NFD"), storageKey);
  });
});

test("buildBunnyMediaProxyUrl: space in filename — single encode without Bunny env", () => {
  withoutBunnyEnv(() => {
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
