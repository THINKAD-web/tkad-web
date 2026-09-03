import assert from "node:assert/strict";
import test from "node:test";
import { selectDigitalMixSource } from "./select-digital-mix-source.ts";

const mixData = {
  input: {
    industry: "BEAUTY",
    goal: "AWARENESS",
    budgetMonthly: 5_000_000,
    periodWeeks: 4,
  },
  generatedAt: "2026-09-03T00:00:00.000Z",
  channels: [
    {
      media: { slug: "ig-awareness-reach", nameKo: "IG", nameEn: "IG" },
      budgetWon: 2_000_000,
      budgetPct: 40,
      reason: "test",
    },
    {
      media: { slug: "fb-awareness", nameKo: "FB", nameEn: "FB" },
      budgetWon: 1_500_000,
      budgetPct: 30,
      reason: "test",
    },
    {
      media: { slug: "yt-awareness", nameKo: "YT", nameEn: "YT" },
      budgetWon: 1_500_000,
      budgetPct: 30,
      reason: "test",
    },
  ],
  kpis: {
    impressionsMin: 1,
    impressionsMax: 2,
    clicksMin: null,
    clicksMax: null,
  },
};

test("selectDigitalMixSource — returns local when mix ok", () => {
  const r = selectDigitalMixSource({
    ok: true,
    data: mixData,
    catalogSize: 23,
  });
  assert.equal(r.source, "local");
  assert.equal(r.localOk, true);
  assert.ok(r.data);
});

test("selectDigitalMixSource — unavailable when local fails", () => {
  const r = selectDigitalMixSource({
    ok: false,
    data: null,
    catalogSize: 0,
    error: "db",
  });
  assert.equal(r.source, "unavailable");
  assert.equal(r.localOk, false);
  assert.equal(r.data, null);
});
