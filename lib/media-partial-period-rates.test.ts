import assert from "node:assert/strict";
import test from "node:test";
import {
  partialPeriodRatesMapFromDraft,
  partialRateLookupKeyFromDays,
  parsePartialPeriodRatePercentInput,
  parsePartialPeriodRatesRaw,
  resolvePartialPeriodRate,
} from "@/lib/media-partial-period-rates";
import type { MediaItem, MediaPriceOption } from "@/lib/media-data";

test("parsePartialPeriodRatePercentInput accepts percent and decimal", () => {
  assert.equal(parsePartialPeriodRatePercentInput("60"), 0.6);
  assert.equal(parsePartialPeriodRatePercentInput("60%"), 0.6);
  assert.equal(parsePartialPeriodRatePercentInput("0.6"), 0.6);
  assert.equal(parsePartialPeriodRatePercentInput(""), null);
  assert.equal(parsePartialPeriodRatePercentInput("0"), null);
});

test("partialRateLookupKeyFromDays — operational 6 units only", () => {
  assert.equal(partialRateLookupKeyFromDays(15), "15days");
  assert.equal(partialRateLookupKeyFromDays(10), null);
  assert.equal(partialRateLookupKeyFromDays(20), null);
});

test("resolvePartialPeriodRate — option override beats media default", () => {
  const media: Pick<MediaItem, "partialPeriodRates"> = {
    partialPeriodRates: { "15days": 0.5 },
  };
  const option: Pick<MediaPriceOption, "partialPeriodRates"> = {
    partialPeriodRates: { "15days": 0.6 },
  };
  assert.equal(resolvePartialPeriodRate(media, option, "15days"), 0.6);
});

test("resolvePartialPeriodRate — media default when option empty", () => {
  const media: Pick<MediaItem, "partialPeriodRates"> = {
    partialPeriodRates: { "15days": 0.7 },
  };
  assert.equal(resolvePartialPeriodRate(media, null, "15days"), 0.7);
  assert.equal(resolvePartialPeriodRate(media, {}, "15days"), 0.7);
});

test("resolvePartialPeriodRate — null when no configured rate", () => {
  const media: Pick<MediaItem, "partialPeriodRates"> = {
    partialPeriodRates: { "7days": 0.45 },
  };
  assert.equal(resolvePartialPeriodRate(media, null, "15days"), null);
  assert.equal(resolvePartialPeriodRate({}, null, "30days"), null);
});

test("parsePartialPeriodRatesRaw remaps legacy keys", () => {
  const map = parsePartialPeriodRatesRaw({
    "2weeks": 0.6,
    "1week": 0.45,
    "3weeks": 0.8,
  });
  assert.deepEqual(map, { "15days": 0.6, "7days": 0.45 });
});

test("partialPeriodRatesMapFromDraft round-trips admin keys", () => {
  const map = partialPeriodRatesMapFromDraft({
    "1day": "",
    "3days": "35",
    "5days": "",
    "7days": "",
    "15days": "60",
    "30days": "",
  });
  assert.deepEqual(map, { "3days": 0.35, "15days": 0.6 });
});
