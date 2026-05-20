import { MEDIA_PACKAGES, type PackageIndustryBadge } from "@/data/packages";
import type { IndustrySlug } from "@/lib/industry-landing";

const INDUSTRY_TO_PACKAGE_BADGES: Record<IndustrySlug, PackageIndustryBadge[]> = {
  beauty: ["beauty", "luxury", "lifestyle"],
  fashion: ["fashion", "luxury", "lifestyle"],
  food: ["fnb"],
  tech: ["tech", "corporate", "telecom"],
  finance: ["finance", "corporate"],
  entertainment: ["entertainment", "global"],
  retail: ["retail", "fmcg"],
};

export function getPackageSlugsForIndustry(slug: IndustrySlug): string[] {
  const badges = INDUSTRY_TO_PACKAGE_BADGES[slug];
  return MEDIA_PACKAGES.filter((p) =>
    p.industryBadges.some((b) => badges.includes(b)),
  ).map((p) => p.slug);
}
