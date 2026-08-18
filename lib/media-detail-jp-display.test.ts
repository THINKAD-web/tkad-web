/**
 * OO — JP 매체 상세 표시 parity (hero / sticky sidebar / CPM).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { formatMediaCostEstimateShort } from "./media-display-currency.ts";
import { formatCatalogPriceFieldWon } from "./media-price-format.ts";
import { resolveCpmDisplay } from "./metrics/format.ts";

const RATE = 0.1126;
const ORIGINAL_RATE = process.env.KRW_JPY_RATE;

test.after(() => {
  if (ORIGINAL_RATE === undefined) delete process.env.KRW_JPY_RATE;
  else process.env.KRW_JPY_RATE = ORIGINAL_RATE;
});

test("OO: JP sticky headline + est cost + CPM use ¥ (KRW SSOT stored)", () => {
  process.env.KRW_JPY_RATE = String(RATE);
  const country = "JP";
  const krwDay = 2_664_298;
  const krwMonth = 33_836_590;
  const cpmKrw = 1_814;

  assert.equal(
    formatCatalogPriceFieldWon(krwDay, "ko-KR", country),
    "¥300,000",
  );
  assert.equal(
    formatCatalogPriceFieldWon(krwMonth, "ko-KR", country),
    "¥3,810,000",
  );
  assert.equal(
    formatMediaCostEstimateShort(krwDay, country, "ko-KR"),
    "약 ¥300,000",
  );
  assert.equal(resolveCpmDisplay(cpmKrw, "ko-KR", country).text, "¥204");
});

test("OO: KR media detail sidebar unchanged (₩)", () => {
  process.env.KRW_JPY_RATE = String(RATE);
  assert.match(formatCatalogPriceFieldWon(300_000, "ko-KR", "KR"), /^₩/);
  assert.match(formatMediaCostEstimateShort(300_000, "KR", "ko-KR"), /만원/);
  assert.equal(resolveCpmDisplay(1_814, "ko-KR", "KR").text, "₩1,814");
});

test("OO: missing country defaults to KR (legacy)", () => {
  process.env.KRW_JPY_RATE = String(RATE);
  assert.match(formatCatalogPriceFieldWon(300_000, "ko-KR"), /^₩/);
});
