import type { MediaPackage } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  MEDIA_PACKAGE_SEED_DATA,
  MEDIA_PACKAGE_SEED_SLUGS,
} from "@/lib/media-package-seed-data";
import {
  parsePackageFaqs,
  parsePackageGuideSteps,
  type PublicMediaPackage,
} from "@/lib/media-package-types";
import {
  buildMediaPackageWhere,
  buildPopularFallbackWhere,
  buildRelaxedMediaPackageWhere,
  mediaPackageSortToOrderBy,
} from "@/lib/media-package-query";
import { compareMediaByMonthlyEquivalentPrice } from "@/lib/media-metrics";
import {
  prismaMediaToMediaItem,
  type MediaWithAdvertiserExecutions,
} from "@/lib/public-media-catalog";
import type { MediaItem } from "@/lib/media-data";
import { publicMediaSortNeedsAppLevelPriceNormalize } from "@/lib/public-media-query";

function rowToPublicPackage(row: MediaPackage): PublicMediaPackage {
  const seed = MEDIA_PACKAGE_SEED_DATA.find((s) => s.slug === row.slug);
  const filterTarget =
    (row.filterTarget ?? []).length > 0
      ? (row.filterTarget ?? [])
      : (seed?.filterTarget ?? []);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    heroColor: row.heroColor,
    icon: row.icon,
    order: row.order,
    isActive: row.isActive,
    filterRegion: row.filterRegion ?? [],
    filterCategory: row.filterCategory ?? [],
    filterTarget,
    filterMaxPrice: row.filterMaxPrice,
    filterMinPrice: row.filterMinPrice,
    sortBy: row.sortBy,
    badgeText: row.badgeText,
    guideSteps: parsePackageGuideSteps(row.guideSteps),
    faqs: parsePackageFaqs(row.faqs),
    targetIndustry: row.targetIndustry ?? [],
    avgBudget: row.avgBudget,
  };
}

function seedRowToPublicPackage(
  seed: (typeof MEDIA_PACKAGE_SEED_DATA)[number],
  index: number,
): PublicMediaPackage {
  return {
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
  };
}

export async function fetchActiveMediaPackages(): Promise<PublicMediaPackage[]> {
  if (!isDatabaseConfigured()) {
    return MEDIA_PACKAGE_SEED_DATA.map(seedRowToPublicPackage);
  }
  try {
    const db = getPrisma();
    const rows = await db.mediaPackage.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    if (rows.length === 0) {
      return MEDIA_PACKAGE_SEED_DATA.map(seedRowToPublicPackage);
    }
    return rows.map(rowToPublicPackage);
  } catch (e) {
    console.error("[fetchActiveMediaPackages]", e);
    return MEDIA_PACKAGE_SEED_DATA.map(seedRowToPublicPackage);
  }
}

export async function fetchMediaPackageBySlug(
  slug: string,
): Promise<PublicMediaPackage | null> {
  const decoded = decodeURIComponent(slug.trim());
  if (!decoded) return null;

  if (!isDatabaseConfigured()) {
    const seed = MEDIA_PACKAGE_SEED_DATA.find((p) => p.slug === decoded);
    return seed ? seedRowToPublicPackage(seed, 0) : null;
  }

  try {
    const db = getPrisma();
    const row = await db.mediaPackage.findFirst({
      where: { slug: decoded, isActive: true },
    });
    if (row) return rowToPublicPackage(row);
    const seed = MEDIA_PACKAGE_SEED_DATA.find((p) => p.slug === decoded);
    return seed ? seedRowToPublicPackage(seed, 0) : null;
  } catch (e) {
    console.error("[fetchMediaPackageBySlug]", e);
    const seed = MEDIA_PACKAGE_SEED_DATA.find((p) => p.slug === decoded);
    return seed ? seedRowToPublicPackage(seed, 0) : null;
  }
}

export async function fetchMediaPackageSlugs(): Promise<string[]> {
  if (!isDatabaseConfigured()) return [...MEDIA_PACKAGE_SEED_SLUGS];
  try {
    const db = getPrisma();
    const rows = await db.mediaPackage.findMany({
      where: { isActive: true },
      select: { slug: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return rows.length > 0
      ? rows.map((r) => r.slug)
      : [...MEDIA_PACKAGE_SEED_SLUGS];
  } catch {
    return [...MEDIA_PACKAGE_SEED_SLUGS];
  }
}

async function queryPackageMediaRows(
  pkg: PublicMediaPackage,
  where: ReturnType<typeof buildMediaPackageWhere>,
  take: number,
): Promise<MediaWithAdvertiserExecutions[]> {
  const db = getPrisma();
  const needsMonthlyPriceSort = publicMediaSortNeedsAppLevelPriceNormalize(
    pkg.sortBy === "price_asc" || pkg.sortBy === "price_desc"
      ? pkg.sortBy
      : null,
  );
  const rows = await db.media.findMany({
    where,
    // price_* 는 raw price 정렬이 틀리므로 안정 키만 쓰고 앱에서 월 환산 재정렬
    orderBy: needsMonthlyPriceSort
      ? [{ id: "asc" }]
      : mediaPackageSortToOrderBy(pkg.sortBy),
    ...(needsMonthlyPriceSort ? {} : { take }),
    include: {
      advertiserExecutions: {
        select: { advertiserName: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!needsMonthlyPriceSort) return rows;
  const direction = pkg.sortBy === "price_desc" ? "desc" : "asc";
  return [...rows]
    .sort((a, b) =>
      compareMediaByMonthlyEquivalentPrice(
        {
          id: a.id,
          price: a.price,
          pricePeriod: a.pricePeriod,
          priceOptions: a.priceOptions as MediaItem["priceOptions"],
        },
        {
          id: b.id,
          price: b.price,
          pricePeriod: b.pricePeriod,
          priceOptions: b.priceOptions as MediaItem["priceOptions"],
        },
        direction,
      ),
    )
    .slice(0, take);
}

export async function fetchMediaForPackage(
  pkg: PublicMediaPackage,
  take = 20,
): Promise<{ media: MediaItem[]; usedFallback: boolean }> {
  if (!isDatabaseConfigured()) {
    return { media: [], usedFallback: false };
  }

  try {
    const strictWhere = buildMediaPackageWhere(pkg);
    let rows = await queryPackageMediaRows(pkg, strictWhere, take);
    let usedFallback = false;

    if (rows.length === 0) {
      const relaxedWhere = buildRelaxedMediaPackageWhere(pkg);
      rows = await queryPackageMediaRows(pkg, relaxedWhere, take);
      usedFallback = rows.length > 0;
    }

    if (rows.length === 0) {
      rows = await queryPackageMediaRows(
        pkg,
        buildPopularFallbackWhere(),
        take,
      );
      usedFallback = rows.length > 0;
    }

    return {
      media: rows.map((row) => prismaMediaToMediaItem(row)),
      usedFallback,
    };
  } catch (e) {
    console.error("[fetchMediaForPackage]", e);
    return { media: [], usedFallback: false };
  }
}
