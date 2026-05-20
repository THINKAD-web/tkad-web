import type { Prisma } from "@prisma/client";
import { geocodeAddressWithKakao } from "@/lib/kakao-address-geocode";
import { normalizeMediaLocationFields } from "@/lib/media-regions";
import { mergeStandardTags, suggestMediaTagsFromText } from "@/lib/media-tags";
import { getPrisma } from "@/lib/prisma";

export type GeocodeMissingResult = {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; name: string; reason: string }>;
};

type MediaRow = {
  id: string;
  name: string;
  location: string;
  city: string | null;
  district: string | null;
  region: string;
  regionZone: string | null;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
};

/**
 * 주소는 있으나 위·경도가 없는 매체를 카카오 지오코딩으로 보완.
 */
export async function geocodeMissingMediaLocations(opts: {
  limit?: number;
  dryRun?: boolean;
}): Promise<GeocodeMissingResult> {
  const db = getPrisma();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const dryRun = opts.dryRun === true;

  const rows = await db.media.findMany({
    where: {
      location: { not: "" },
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      name: true,
      location: true,
      city: true,
      district: true,
      region: true,
      regionZone: true,
      tags: true,
      latitude: true,
      longitude: true,
    },
    take: limit,
    orderBy: { updatedAt: "asc" },
  });

  const result: GeocodeMissingResult = {
    scanned: rows.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows as MediaRow[]) {
    const hit = await geocodeAddressWithKakao(row.location);
    if (!hit) {
      result.failed += 1;
      result.errors.push({
        id: row.id,
        name: row.name,
        reason: "지오코딩 결과 없음",
      });
      continue;
    }

    const loc = normalizeMediaLocationFields({
      city: hit.city || row.city,
      district: hit.district || row.district,
      location: hit.addressName || row.location,
      region: row.region,
      regionZone: row.regionZone,
    });

    const suggested = suggestMediaTagsFromText(
      `${row.name} ${row.location} ${hit.addressName}`,
    );
    const tags = mergeStandardTags(row.tags ?? [], suggested);

    if (dryRun) {
      result.updated += 1;
      continue;
    }

    try {
      await db.media.update({
        where: { id: row.id },
        data: {
          latitude: hit.latitude,
          longitude: hit.longitude,
          city: loc.city || hit.city,
          district: loc.district || hit.district,
          region: loc.region,
          regionZone: loc.regionZone,
          tags,
          addressVerified: true,
        } satisfies Prisma.MediaUpdateInput,
      });
      result.updated += 1;
    } catch (e) {
      result.failed += 1;
      result.errors.push({
        id: row.id,
        name: row.name,
        reason: e instanceof Error ? e.message : "DB 업데이트 실패",
      });
    }
  }

  return result;
}
