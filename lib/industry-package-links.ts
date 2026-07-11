import type { IndustrySlug } from "@/lib/industry-landing";
import { MEDIA_PACKAGE_SEED_DATA } from "@/lib/media-package-seed-data";
import type { PublicMediaPackage } from "@/lib/media-package-types";

/**
 * 업종 → SSOT 패키지 슬러그 (DB/시드).
 * 레거시 `data/packages.ts` industryBadges 매핑을 시드 슬러그로 이관.
 */
const INDUSTRY_TO_PACKAGE_SLUGS: Record<IndustrySlug, string[]> = {
  beauty: ["gangnam-premium", "seongsu-vibe"],
  fashion: ["gangnam-premium", "seongsu-vibe"],
  food: ["local-starter", "seongsu-vibe"],
  tech: ["gangnam-premium", "campus-campaign"],
  finance: ["gangnam-premium"],
  entertainment: ["fandom-hotspot"],
  retail: ["local-starter"],
};

/** @deprecated 레거시 슬러그 → SSOT 슬러그 (industry·구 URL 호환) */
export const LEGACY_PACKAGE_SLUG_TO_SSOT: Record<string, string> = {
  "seongsu-hannam": "seongsu-vibe",
  "kpop-fandom": "fandom-hotspot",
  "downtown-coverage": "gangnam-premium",
  "national-launch": "gangnam-premium",
};

export function getPackageSlugsForIndustry(slug: IndustrySlug): string[] {
  return [...(INDUSTRY_TO_PACKAGE_SLUGS[slug] ?? [])];
}

export function resolveSsotPackageSlug(slug: string): string {
  return LEGACY_PACKAGE_SLUG_TO_SSOT[slug] ?? slug;
}

/** 시드 기준 동기 조회 — industry 서버 컴포넌트용 */
export function getSeedPackagesForIndustry(
  slug: IndustrySlug,
): PublicMediaPackage[] {
  const slugs = new Set(getPackageSlugsForIndustry(slug));
  return MEDIA_PACKAGE_SEED_DATA.filter((p) => slugs.has(p.slug)).map(
    (seed, index) => ({
      id: `seed-${seed.slug}`,
      slug: seed.slug,
      name: seed.name,
      subtitle: seed.subtitle,
      description: seed.description,
      heroColor: seed.heroColor,
      icon: seed.icon,
      order: seed.order ?? index + 1,
      isActive: seed.isActive ?? true,
      filterRegion: seed.filterRegion,
      filterCategory: seed.filterCategory,
      filterTarget: seed.filterTarget,
      filterMaxPrice: seed.filterMaxPrice,
      filterMinPrice: seed.filterMinPrice,
      sortBy: seed.sortBy,
      badgeText: seed.badgeText ?? null,
      guideSteps: seed.guideSteps,
      faqs: seed.faqs,
      targetIndustry: seed.targetIndustry,
      avgBudget: seed.avgBudget ?? null,
    }),
  );
}
