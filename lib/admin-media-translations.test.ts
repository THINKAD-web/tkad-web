import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatAdminTranslationStatusLabel,
  isAdminTranslationPayloadEmpty,
  parseAdminMediaTranslationsBody,
} from "@/lib/admin-media-translations";

test("isAdminTranslationPayloadEmpty — all blank", () => {
  assert.equal(
    isAdminTranslationPayloadEmpty({ name: " ", description: "", location: null }),
    true,
  );
  assert.equal(isAdminTranslationPayloadEmpty(null), true);
});

test("parseAdminMediaTranslationsBody", () => {
  const parsed = parseAdminMediaTranslationsBody({
    translations: {
      ja: { name: " JA ", description: null, location: "東京" },
      zh: null,
    },
  });
  assert.deepEqual(parsed?.ja, {
    name: "JA",
    description: null,
    location: "東京",
  });
  assert.equal(parsed?.zh, null);
});

test("formatAdminTranslationStatusLabel", () => {
  assert.equal(
    formatAdminTranslationStatusLabel([
      { locale: "ja", name: "x", description: null, location: null, source: "reviewed" },
      { locale: "zh", name: "y", description: null, location: null, source: "ai" },
    ]),
    "ja✓ zh(AI)",
  );
  assert.equal(formatAdminTranslationStatusLabel([]), "ja✗ zh✗");
});
