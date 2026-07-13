import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem, MediaPriceOption } from "@/lib/media-data";
import {
  partialPeriodRatesMapFromDraft,
  parsePartialPeriodRatePercentInput,
  resolvePartialPeriodRate,
} from "@/lib/media-partial-period-rates";

test("parsePartialPeriodRatePercentInput accepts percent and decimal", () => {
  assert.equal(parsePartialPeriodRatePercentInput("60"), 0.6);
  assert.equal(parsePartialPeriodRatePercentInput("60%"), 0.6);
  assert.equal(parsePartialPeriodRatePercentInput("0.6"), 0.6);
  assert.equal(parsePartialPeriodRatePercentInput(""), null);
  assert.equal(parsePartialPeriodRatePercentInput("0"), null);
});

test("resolvePartialPeriodRate — option override beats media default", () => {
  const media: Pick<MediaItem, "partialPeriodRates"> = {
    partialPeriodRates: { "2weeks": 0.5 },
  };
  const option: Pick<MediaPriceOption, "partialPeriodRates"> = {
    partialPeriodRates: { "2weeks": 0.6 },
  };
  assert.equal(resolvePartialPeriodRate(media, option, "2weeks"), 0.6);
});

test("resolvePartialPeriodRate — media default when option empty", () => {
  const media: Pick<MediaItem, "partialPeriodRates"> = {
    partialPeriodRates: { "2weeks": 0.7 },
  };
  assert.equal(resolvePartialPeriodRate(media, null, "2weeks"), 0.7);
  assert.equal(resolvePartialPeriodRate(media, {}, "2weeks"), 0.7);
});

test("resolvePartialPeriodRate — null when no configured rate", () => {
  const media: Pick<MediaItem, "partialPeriodRates"> = {
    partialPeriodRates: { "1week": 0.45 },
  };
  assert.equal(resolvePartialPeriodRate(media, null, "2weeks"), null);
  assert.equal(resolvePartialPeriodRate({}, null, "1month"), null);
});

test("partialPeriodRatesMapFromDraft round-trips admin keys", () => {
  const map = partialPeriodRatesMapFromDraft({
    "3days": "35",
    "1week": "",
    "2weeks": "60",
    "3weeks": "",
  });
  assert.deepEqual(map, { "3days": 0.35, "2weeks": 0.6 });
});
