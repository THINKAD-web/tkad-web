import type { MediaItem } from "@/lib/media-data";
import type { PublicMediaPackage } from "@/lib/media-package-types";
import {
  buildMediaPackageWhere,
  buildRelaxedMediaPackageWhere,
  mediaPackageSortToOrderBy,
} from "@/lib/media-package-query";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { filterDisplayableMediaImageUrls } from "@/lib/optimized-image-url";
import { dedupeImageUrls } from "@/lib/media-data";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import {
  mediaMatchesCategorySlug,
  mediaMatchesTargetSlug,
} from "@/lib/media-category-landing";
import { MEDIA_CAMPAIGN_TARGET_CARDS } from "@/lib/media-campaign-target-cards";

export type MediaLandingPreview = {
  matchCount: number;
  thumbnails: string[];
};

function thumbFromUrls(urls: string[]): string[] {
  return filterDisplayableMediaImageUrls(dedupeImageUrls(urls)).slice(0, 3);
}

function mediaThumbnails(items: MediaItem[]): string[] {
  const urls: string[] = [];
  for (const m of items) {
    const first = m.sampleImages?.[0]?.trim();
    if (first) urls.push(first);
    if (urls.length >= 3) break;
  }
  return thumbFromUrls(urls);
}

/** 카탈로그 폴백 — Prisma where 와 유사한 느슨한 매칭 (필터 코어 미변경) */
function catalogMatchesPackage(m: MediaItem, pkg: PublicMediaPackage): boolean {
  if (pkg.filterRegion.length > 0) {
    const hay = [m.region, m.location, m.regionMain, m.regionSub, m.regionZone]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!pkg.filterRegion.some((r) => hay.includes(r.trim().toLowerCase()))) {
      return false;
    }
  }
  if (pkg.filterCategory.length > 0) {
    const ok = pkg.filterCategory.some(
      (c) =>
        mediaMatchesCategorySlug(m, c) ||
        (m.type?.toLowerCase() === c.toLowerCase()) ||
        (m.tags ?? []).includes(c),
    );
    if (!ok) return false;
  }
  if (pkg.filterTarget.length > 0) {
    const ok = pkg.filterTarget.some((t) => mediaMatchesTargetSlug(m, t));
    if (!ok) return false;
  }
  if (pkg.filterMinPrice != null && m.price < pkg.filterMinPrice) return false;
  if (pkg.filterMaxPrice != null && m.price > pkg.filterMaxPrice) return false;
  return true;
}

async function previewFromDb(
  pkg: PublicMediaPackage,
): Promise<MediaLandingPreview> {
  const db = getPrisma();
  const strictWhere = buildMediaPackageWhere(pkg);
  let count = await db.media.count({ where: strictWhere });
  let where = strictWhere;

  if (count === 0) {
    const relaxed = buildRelaxedMediaPackageWhere(pkg);
    count = await db.media.count({ where: relaxed });
    where = relaxed;
  }

  const rows = await db.media.findMany({
    where,
    orderBy: mediaPackageSortToOrderBy(pkg.sortBy),
    take: 3,
    select: { image: true, extractedImages: true },
  });

  const urls = rows.flatMap((r) =>
    [r.image, ...(r.extractedImages ?? [])].filter(
      (x): x is string => typeof x === "string" && Boolean(x.trim()),
    ),
  );

  return { matchCount: count, thumbnails: thumbFromUrls(urls) };
}

function previewFromCatalog(
  pkg: PublicMediaPackage,
  catalog: readonly MediaItem[],
): MediaLandingPreview {
  const matched = catalog.filter((m) => catalogMatchesPackage(m, pkg));
  return {
    matchCount: matched.length,
    thumbnails: mediaThumbnails(matched),
  };
}

export async function fetchPackageLandingPreviews(
  packages: readonly PublicMediaPackage[],
): Promise<Record<string, MediaLandingPreview>> {
  const out: Record<string, MediaLandingPreview> = {};
  if (packages.length === 0) return out;

  if (isDatabaseConfigured()) {
    try {
      await Promise.all(
        packages.map(async (pkg) => {
          out[pkg.slug] = await previewFromDb(pkg);
        }),
      );
      return out;
    } catch (e) {
      console.error("[fetchPackageLandingPreviews] db", e);
    }
  }

  const catalog = await fetchPublicMediaCatalog();
  for (const pkg of packages) {
    out[pkg.slug] = previewFromCatalog(pkg, catalog);
  }
  return out;
}

export async function fetchTargetLandingPreviews(): Promise<
  Record<string, MediaLandingPreview>
> {
  const catalog = await fetchPublicMediaCatalog();
  const out: Record<string, MediaLandingPreview> = {};
  for (const card of MEDIA_CAMPAIGN_TARGET_CARDS) {
    const matched = catalog.filter((m) =>
      mediaMatchesTargetSlug(m, card.slug),
    );
    out[card.slug] = {
      matchCount: matched.length,
      thumbnails: mediaThumbnails(matched),
    };
  }
  return out;
}
