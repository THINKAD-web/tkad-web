import assert from "node:assert/strict";
import test from "node:test";
import { buildBunnyCdnUrl } from "./bunny-storage";

const ENV_KEY = "BUNNY_CDN_BASE_URL";

test("buildBunnyCdnUrl matrix", async (t) => {
  const previous = process.env[ENV_KEY];

  t.after(() => {
    if (previous === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = previous;
  });

  await t.test("base with /tkad + objectPath already starts with tkad/", () => {
    process.env[ENV_KEY] = "https://tkad-cdn.b-cdn.net/tkad";
    assert.equal(
      buildBunnyCdnUrl("tkad/admin/foo.jpg"),
      "https://tkad-cdn.b-cdn.net/tkad/admin/foo.jpg",
    );
  });

  await t.test("host-only base + objectPath includes tkad/", () => {
    process.env[ENV_KEY] = "https://tkad-cdn.b-cdn.net";
    assert.equal(
      buildBunnyCdnUrl("tkad/admin/foo.jpg"),
      "https://tkad-cdn.b-cdn.net/tkad/admin/foo.jpg",
    );
  });

  await t.test("base with /tkad + objectPath without tkad prefix", () => {
    process.env[ENV_KEY] = "https://tkad-cdn.b-cdn.net/tkad";
    assert.equal(
      buildBunnyCdnUrl("admin/foo.jpg"),
      "https://tkad-cdn.b-cdn.net/tkad/admin/foo.jpg",
    );
  });

  await t.test("host-only base + objectPath without tkad prefix", () => {
    process.env[ENV_KEY] = "https://tkad-cdn.b-cdn.net";
    assert.equal(
      buildBunnyCdnUrl("admin/foo.jpg"),
      "https://tkad-cdn.b-cdn.net/admin/foo.jpg",
    );
  });
});
