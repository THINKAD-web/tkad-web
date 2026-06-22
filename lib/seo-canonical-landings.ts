/**
 * SEO PR2 — duplicate landing URL canonical targets.
 *
 * Representative URLs (keyword + FAQ rich `/type/*`) consolidate taxonomy
 * (`/media/category/*`) and technical (`/media/type/*`) duplicates.
 * Tier-1 categories without a marketing twin (bus, elevator, bus_shelter)
 * keep self-canonical.
 */
import {
  MARKETING_MEDIA_TYPE_SLUGS,
  type MarketingMediaTypeSlug,
} from "@/lib/marketing-media-types";
import { KNOWN_TYPE_SLUGS } from "@/lib/media-keyword-landing";
import { TIER1_MEDIA_CATEGORY_SLUGS } from "@/lib/seo-landing-copy";

/** Marketing landings that exist under `/type/{slug}`. */
export const MARKETING_LANDING_SLUGS = MARKETING_MEDIA_TYPE_SLUGS;

export type MarketingLandingSlug = MarketingMediaTypeSlug;

/** Tier-1 category slugs that defer canonical to `/type/*` (exact slug match only). */
export const CATEGORY_SLUG_CANONICAL_TO_TYPE: Readonly<
  Partial<Record<string, MarketingLandingSlug>>
> = {
  billboard: "billboard",
  subway: "subway",
  dooh: "dooh",
};

/** DB `Media.type` technical slugs → marketing canonical. */
export const TECHNICAL_TYPE_CANONICAL_TO_TYPE: Readonly<
  Partial<Record<string, MarketingLandingSlug>>
> = {
  static: "billboard",
  digital: "dooh",
  mobile: "subway",
};

/** Tier-1 categories that remain self-canonical (no `/type/*` twin). */
export const TIER1_SELF_CANONICAL_CATEGORY_SLUGS = TIER1_MEDIA_CATEGORY_SLUGS.filter(
  (slug) => !(slug in CATEGORY_SLUG_CANONICAL_TO_TYPE),
);

export function marketingTypeCanonicalPath(slug: MarketingLandingSlug): string {
  return `/type/${slug}`;
}

/** Canonical path for `/media/category/{slug}` — self when no marketing twin. */
export function categoryLandingCanonicalPath(slug: string): string {
  const target = CATEGORY_SLUG_CANONICAL_TO_TYPE[slug];
  if (target) return marketingTypeCanonicalPath(target);
  return `/media/category/${slug}`;
}

export function categoryLandingUsesExternalCanonical(slug: string): boolean {
  return slug in CATEGORY_SLUG_CANONICAL_TO_TYPE;
}

/** Canonical path for `/media/type/{technical}` — self when unmapped. */
export function technicalTypeLandingCanonicalPath(technicalSlug: string): string {
  const target = TECHNICAL_TYPE_CANONICAL_TO_TYPE[technicalSlug];
  if (target) return marketingTypeCanonicalPath(target);
  return `/media/type/${technicalSlug}`;
}

export function technicalTypeLandingUsesExternalCanonical(
  technicalSlug: string,
): boolean {
  return technicalSlug in TECHNICAL_TYPE_CANONICAL_TO_TYPE;
}

/** Known technical type slugs (for sitemap / tests). */
export const TECHNICAL_MEDIA_TYPE_SLUGS = KNOWN_TYPE_SLUGS;
