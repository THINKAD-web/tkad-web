/**
 * SEO PR3 — sitemap fallback & priority smoke tests.
 * Run: npx tsx scripts/test-sitemap-fallback.mts
 */
import assert from "node:assert/strict";
import {
  buildCatalogDerivedSitemapParts,
  createSitemapBuildContext,
  CRITICAL_SITEMAP_PATHS,
  isTechnicalMediaTypeLandingPath,
  sitemapPriority,
} from "../lib/sitemap-build.ts";
import { KNOWN_REGION_SLUGS, KNOWN_TYPE_SLUGS } from "../lib/media-keyword-landing.ts";
import { publicSitemapUrl } from "../lib/sitemap-ping.ts";

const ctx = createSitemapBuildContext();

// Empty catalog → static region/type fallbacks (not zero URLs)
const empty = buildCatalogDerivedSitemapParts(ctx, []);
assert.equal(empty.mediaPart.length, 0);
assert.equal(empty.usedRegionFallback, true);
assert.equal(empty.usedTypeFallback, true);
assert.equal(empty.regionLandingPart.length, KNOWN_REGION_SLUGS.length);
assert.equal(empty.typeLandingPart.length, KNOWN_TYPE_SLUGS.length);
assert.equal(empty.areaLandingPart.length, 0);

for (const region of KNOWN_REGION_SLUGS) {
  assert.ok(
    empty.regionLandingPart.some((e) => e.url.includes(`/media/region/${region}`)),
    `missing region fallback ${region}`,
  );
}

// Non-empty catalog → DB-derived sets, no fallback flags
const fakeCatalog = [
  {
    id: "m1",
    slug: "test-media",
    region: "seoul",
    type: "digital",
    district: "강남구",
    city: "서울",
  },
] as Parameters<typeof buildCatalogDerivedSitemapParts>[1];
const derived = buildCatalogDerivedSitemapParts(ctx, fakeCatalog);
assert.equal(derived.mediaPart.length, 1);
assert.equal(derived.usedRegionFallback, false);
assert.equal(derived.usedTypeFallback, false);
assert.equal(derived.regionLandingPart.length, 1);
assert.equal(derived.areaLandingPart.length, 1);

// Priority boosts for SEO landings
assert.equal(sitemapPriority("/type/billboard"), 0.85);
assert.equal(sitemapPriority("/local/gangnam"), 0.85);
assert.equal(sitemapPriority("/media/category/billboard"), 0.85);
assert.equal(sitemapPriority("/media/category/retail"), 0.7);

// Technical /media/type/* lower than marketing /type/*
assert.equal(sitemapPriority("/media/type/digital"), 0.55);
assert.ok(isTechnicalMediaTypeLandingPath("/media/type/digital"));
assert.ok(!isTechnicalMediaTypeLandingPath("/media/type/custom-slug"));

// Critical paths always defined
assert.ok(CRITICAL_SITEMAP_PATHS.includes("/media"));
assert.ok(CRITICAL_SITEMAP_PATHS.includes("/planner"));

// robots / ping use same sitemap URL shape
assert.match(publicSitemapUrl(), /\/sitemap\.xml$/);

console.log("test-sitemap-fallback: all assertions passed");
