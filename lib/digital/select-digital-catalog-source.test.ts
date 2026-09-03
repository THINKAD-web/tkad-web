import assert from "node:assert/strict";
import test from "node:test";
import { selectDigitalCatalogSource } from "./select-digital-catalog-source.ts";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

const item: DigitalCatalogItem = {
  slug: "naver-sa-traffic",
  nameKo: "네이버",
  channel: "NAVER_SA",
  platform: "Naver",
  mediaType: "SA",
  cpcMin: 400,
  cpcMax: 1200,
  cpmMin: null,
  cpmMax: null,
};

const localOk = {
  ok: true,
  items: [item],
  count: 1,
  fetchedAt: "2026-09-03T00:00:00.000Z",
};

const remoteOk = {
  ok: true,
  items: [item],
  count: 1,
  fetchedAt: "2026-09-03T00:00:01.000Z",
};

const failed = {
  ok: false,
  items: [],
  count: 0,
  fetchedAt: "",
  error: "fail",
};

test("selectDigitalCatalogSource — default prefers local when both ok", () => {
  const r = selectDigitalCatalogSource({
    forceLocal: false,
    local: localOk,
    remote: remoteOk,
  });
  assert.equal(r.source, "local");
  assert.equal(r.usedDmpilotFallback, false);
});

test("selectDigitalCatalogSource — dmpilot fallback when local fails", () => {
  const r = selectDigitalCatalogSource({
    forceLocal: false,
    local: failed,
    remote: remoteOk,
  });
  assert.equal(r.source, "dmpilot");
  assert.equal(r.usedDmpilotFallback, true);
});

test("selectDigitalCatalogSource — unavailable when both fail", () => {
  const r = selectDigitalCatalogSource({
    forceLocal: false,
    local: failed,
    remote: failed,
  });
  assert.equal(r.source, "unavailable");
  assert.equal(r.items.length, 0);
});

test("selectDigitalCatalogSource — forceLocal skips dmpilot fallback", () => {
  const r = selectDigitalCatalogSource({
    forceLocal: true,
    local: failed,
    remote: remoteOk,
  });
  assert.equal(r.source, "unavailable");
  assert.equal(r.remoteOk, false);
});
