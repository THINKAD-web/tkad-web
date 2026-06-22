/**
 * SEO PR2 — canonical landing mapping smoke tests.
 * Run: npx tsx scripts/test-seo-pr2-canonical.mts
 */
import assert from "node:assert/strict";
import {
  categoryLandingCanonicalPath,
  categoryLandingUsesExternalCanonical,
  technicalTypeLandingCanonicalPath,
  technicalTypeLandingUsesExternalCanonical,
  TIER1_SELF_CANONICAL_CATEGORY_SLUGS,
} from "../lib/seo-canonical-landings.ts";
import { pageAlternates, pageAlternatesForCanonical } from "../lib/seo.ts";

assert.equal(categoryLandingCanonicalPath("billboard"), "/type/billboard");
assert.equal(categoryLandingCanonicalPath("subway"), "/type/subway");
assert.equal(categoryLandingCanonicalPath("dooh"), "/type/dooh");
assert.equal(categoryLandingCanonicalPath("bus"), "/media/category/bus");
assert.equal(categoryLandingCanonicalPath("elevator"), "/media/category/elevator");
assert.equal(categoryLandingCanonicalPath("bus_shelter"), "/media/category/bus_shelter");

assert.equal(categoryLandingUsesExternalCanonical("billboard"), true);
assert.equal(categoryLandingUsesExternalCanonical("bus"), false);

assert.equal(technicalTypeLandingCanonicalPath("static"), "/type/billboard");
assert.equal(technicalTypeLandingCanonicalPath("digital"), "/type/dooh");
assert.equal(technicalTypeLandingCanonicalPath("mobile"), "/type/subway");
assert.equal(technicalTypeLandingCanonicalPath("network"), "/media/type/network");
assert.equal(technicalTypeLandingUsesExternalCanonical("static"), true);
assert.equal(technicalTypeLandingUsesExternalCanonical("network"), false);

assert.ok(TIER1_SELF_CANONICAL_CATEGORY_SLUGS.includes("bus"));
assert.ok(TIER1_SELF_CANONICAL_CATEGORY_SLUGS.includes("elevator"));

const koBillboardCategory = pageAlternatesForCanonical("ko", "/type/billboard");
assert.equal(koBillboardCategory.canonical, "/ko/type/billboard");
assert.match(String(koBillboardCategory.languages?.ko), /\/ko\/type\/billboard$/);

const koBusCategory = pageAlternates("ko", "/media/category/bus");
assert.equal(koBusCategory.canonical, "/ko/media/category/bus");

console.log("test-seo-pr2-canonical: all assertions passed");
