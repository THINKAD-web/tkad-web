import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveMediaDisplayLabels,
  resolveMediaDisplayPill,
} from "./media-display-labels.ts";

test("offline display mode pill", () => {
  const labels = resolveMediaDisplayLabels(
    { catalogChannel: "offline", type: "mobile" },
    "ko",
  );
  assert.equal(labels.pill, "이동형");
  assert.equal(labels.catalogChannel, "offline");
});

test("online browse main pill — no raw type", () => {
  const labels = resolveMediaDisplayLabels(
    {
      catalogChannel: "online",
      type: null,
      mediaMainCategory: "search",
    },
    "ko",
  );
  assert.equal(labels.pill, "검색광고");
  assert.equal(labels.catalogChannel, "online");
  assert.equal(resolveMediaDisplayPill({ type: "mobile", catalogChannel: "online", mediaMainCategory: "sns" }, "ko"), "SNS");
});

test("online without main falls back to channel label", () => {
  assert.equal(
    resolveMediaDisplayPill({ catalogChannel: "online", type: null }, "ko"),
    "온라인 광고",
  );
});

test("never returns raw type slug for unknown offline type", () => {
  const pill = resolveMediaDisplayPill({ type: "mobile", catalogChannel: "offline" }, "ko");
  assert.notEqual(pill, "mobile");
  assert.equal(pill, "이동형");
});
