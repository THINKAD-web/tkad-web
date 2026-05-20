import type { Prisma } from "@prisma/client";
import { normalizeMediaLocationFields, regionZoneLabel } from "@/lib/media-regions";
import { normalizeMediaTags } from "@/lib/media-tags";
import { getPrisma } from "@/lib/prisma";

export type NormalizeRegionsResult = {
  scanned: number;
  updated: number;
  unchanged: number;
};

/**
 * 전체(또는 일부) 매체의 region / regionZone / district 정규화.
 */
export async function normalizeAllMediaRegions(opts?: {
  limit?: number;
  onlyMissingZone?: boolean;
}): Promise<NormalizeRegionsResult> {
  const db = getPrisma();
  const limit = opts?.limit;
  const onlyMissingZone = opts?.onlyMissingZone === true;

  const rows = await db.media.findMany({
    where: onlyMissingZone ? { regionZone: null } : undefined,
    select: {
      id: true,
      city: true,
      district: true,
      location: true,
      region: true,
      regionZone: true,
      tags: true,
    },
    ...(limit ? { take: limit } : {}),
    orderBy: { updatedAt: "asc" },
  });

  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const loc = normalizeMediaLocationFields({
      city: row.city,
      district: row.district,
      location: row.location,
      region: row.region,
      regionZone: row.regionZone,
    });

    const zoneLabel = regionZoneLabel(loc.regionZone, "ko");
    const baseTags = (row.tags ?? []).filter((t) => t !== zoneLabel);
    const nextTags =
      zoneLabel && !baseTags.includes(zoneLabel)
        ? normalizeMediaTags([...baseTags, zoneLabel])
        : normalizeMediaTags(baseTags);

    const changed =
      row.region !== loc.region ||
      row.regionZone !== loc.regionZone ||
      (row.district ?? "") !== loc.district ||
      (row.city ?? "") !== loc.city;

    if (!changed) {
      unchanged += 1;
      continue;
    }

    await db.media.update({
      where: { id: row.id },
      data: {
        region: loc.region,
        regionZone: loc.regionZone,
        district: loc.district || row.district,
        city: loc.city || row.city,
        tags: nextTags,
      } satisfies Prisma.MediaUpdateInput,
    });
    updated += 1;
  }

  return { scanned: rows.length, updated, unchanged };
}
