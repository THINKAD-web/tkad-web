import assert from "node:assert/strict";
import test from "node:test";
import { MODEL_VERSIONS } from "@/lib/media/engine/constants";
import {
  dailyFootfallMirrorsEngineDaily,
  resolvePublicMonthlyImpressions,
  storedMonthlyLikelyFootTrafficProxy,
} from "@/lib/media-impressions-ssot";

test("detects footfall mirrored as engine daily impressions", () => {
  assert.equal(dailyFootfallMirrorsEngineDaily(317_678, 317_678), true);
  assert.equal(dailyFootfallMirrorsEngineDaily(317_678, 150_000), false);
});

test("detects monthly stored as foot traffic proxy", () => {
  assert.equal(storedMonthlyLikelyFootTrafficProxy(317_678, 317_678), true);
  assert.equal(
    storedMonthlyLikelyFootTrafficProxy(317_678 * 30, 317_678),
    true,
  );
  assert.equal(storedMonthlyLikelyFootTrafficProxy(4_500_000, 317_678), false);
});

test("v0 footfall mirror ignores stored impressions and models OTS", () => {
  const monthly = resolvePublicMonthlyImpressions({
    impressions: 4_500_000,
    dailyFootTraffic: 317_678,
    engineDailyImpressions: 317_678,
    impressionModelVersion: MODEL_VERSIONS.V0_FALLBACK,
    mediaType: "DOOH",
    mediaName: "케이팝스퀘어",
    factSheet: { spotDurationSec: 30, loopDurationSec: 300 },
  });
  assert.ok(monthly > 0);
  assert.ok(monthly < 4_500_000);
});
