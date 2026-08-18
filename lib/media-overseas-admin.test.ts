import assert from "node:assert/strict";
import test from "node:test";
import { MEDIA_BROWSE_REGIONS } from "./media-browse-regions.ts";
import { stripLockedFieldsForMediaSave } from "./media/locked-fields.ts";

test("MEDIA_BROWSE_REGIONS includes overseas escape hatch", () => {
  const overseas = MEDIA_BROWSE_REGIONS.find((r) => r.id === "overseas");
  assert.ok(overseas);
  assert.equal(overseas?.label, "해외");
});

test("stripLockedFieldsForMediaSave: KR strips footfall", () => {
  const { cleaned, stripped } = stripLockedFieldsForMediaSave(
    { dailyFootfall: 1000, name: "x" },
    "KR",
  );
  assert.equal("dailyFootfall" in cleaned, false);
  assert.ok(stripped.includes("dailyFootfall"));
});

test("stripLockedFieldsForMediaSave: JP preserves footfall", () => {
  const { cleaned, stripped } = stripLockedFieldsForMediaSave(
    { dailyFootfall: 5000, weekdayFootfall: 4000, cpm: 10 },
    "JP",
  );
  assert.equal(cleaned.dailyFootfall, 5000);
  assert.equal(cleaned.weekdayFootfall, 4000);
  assert.equal("cpm" in cleaned, false);
  assert.ok(stripped.includes("cpm"));
  assert.equal(stripped.includes("dailyFootfall"), false);
});
