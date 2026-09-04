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

const failed = {
  ok: false,
  items: [],
  count: 0,
  fetchedAt: "",
  error: "fail",
};

test("selectDigitalCatalogSource — returns local when catalog ok", () => {
  const r = selectDigitalCatalogSource(localOk);
  assert.equal(r.source, "local");
  assert.equal(r.localOk, true);
  assert.equal(r.items.length, 1);
});

test("selectDigitalCatalogSource — unavailable when local fails", () => {
  const r = selectDigitalCatalogSource(failed);
  assert.equal(r.source, "unavailable");
  assert.equal(r.localOk, false);
  assert.equal(r.items.length, 0);
});
