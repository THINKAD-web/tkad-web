import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAsciiBunnyObjectPath,
  buildAdminBunnyImageUploadPath,
  buildBunnyUuidUploadPath,
  bunnyUploadExtFromContentType,
  bunnyUploadExtFromFileName,
} from "@/lib/bunny-upload-path";

test("bunnyUploadExtFromFileName ignores Korean basename, keeps safe ext", () => {
  const nfd = "강남사진".normalize("NFD");
  assert.equal(bunnyUploadExtFromFileName(`${nfd}.PNG`, "image/png"), "png");
  assert.equal(
    bunnyUploadExtFromFileName(`${nfd}.jpg`, "image/jpeg"),
    "jpg",
  );
});

test("bunnyUploadExtFromFileName falls back to content-type for bad ext", () => {
  assert.equal(
    bunnyUploadExtFromFileName("한글파일", "image/webp"),
    "webp",
  );
  assert.equal(
    bunnyUploadExtFromFileName("시안.제이피지", "image/jpeg"),
    "jpg",
  );
});

test("buildBunnyUuidUploadPath is ASCII-only UUID key", () => {
  const path = buildBunnyUuidUploadPath(
    "tkad/admin/2026/07",
    "jpg",
    "0d44e972-2876-4145-b552-6c8641c53867",
  );
  assert.equal(
    path,
    "tkad/admin/2026/07/0d44e972-2876-4145-b552-6c8641c53867.jpg",
  );
  assert.equal(assertAsciiBunnyObjectPath(path), path);
  assert.ok(!/[^\x00-\x7F]/.test(path));
});

test("buildAdminBunnyImageUploadPath never embeds original Korean name", () => {
  const nfd = "외벽광고_시안".normalize("NFD");
  const path = buildAdminBunnyImageUploadPath(
    "image/jpeg",
    `${nfd}.jpg`,
    new Date("2026-07-21T12:00:00Z"),
  );
  assert.match(path, /^tkad\/admin\/2026\/07\/[a-f0-9-]+\.jpg$/i);
  assert.ok(!path.includes(nfd));
  assert.ok(!/[^\x00-\x7F]/.test(path));
});

test("assertAsciiBunnyObjectPath rejects Korean / traversal", () => {
  assert.throws(() => assertAsciiBunnyObjectPath("tkad/admin/강남.jpg"), {
    message: "BUNNY_PATH_NOT_ASCII",
  });
  assert.throws(() => assertAsciiBunnyObjectPath("tkad/../secret"), {
    message: "BUNNY_PATH_TRAVERSAL",
  });
});
