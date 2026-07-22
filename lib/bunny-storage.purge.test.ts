import assert from "node:assert/strict";
import test from "node:test";
import {
  bunnyPublicUrlsRemoved,
  resolveBunnyUrlsToPurge,
} from "./bunny-storage";

const ENV_KEY = "BUNNY_CDN_BASE_URL";
const A = "https://tkad-cdn.b-cdn.net/tkad/admin/a.jpg";
const B = "https://tkad-cdn.b-cdn.net/tkad/admin/b.jpg";
const C = "https://tkad-cdn.b-cdn.net/tkad/admin/c.jpg";

test("resolveBunnyUrlsToPurge requires explicit intent", async (t) => {
  const previous = process.env[ENV_KEY];
  process.env[ENV_KEY] = "https://tkad-cdn.b-cdn.net/tkad";
  t.after(() => {
    if (previous === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = previous;
  });

  const candidates = bunnyPublicUrlsRemoved([A, B, C], [A, C]);
  assert.deepEqual(candidates, [B]);

  const noIntent = resolveBunnyUrlsToPurge([A, B, C], [A, C], undefined);
  assert.deepEqual(noIntent.toPurge, []);
  assert.deepEqual(noIntent.skippedWithoutIntent, [B]);

  const withIntent = resolveBunnyUrlsToPurge([A, B, C], [A, C], [B]);
  assert.deepEqual(withIntent.toPurge, [B]);
  assert.deepEqual(withIntent.skippedWithoutIntent, []);

  const mismatchedIntent = resolveBunnyUrlsToPurge([A, B, C], [A, C], [A]);
  assert.deepEqual(mismatchedIntent.toPurge, []);
  assert.deepEqual(mismatchedIntent.skippedWithoutIntent, [B]);
});
