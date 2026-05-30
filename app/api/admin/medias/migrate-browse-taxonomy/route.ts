import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  inferBrowseCategoryFromMedia,
  mergeBrowseIntoMediaCategory,
} from "@/lib/media-browse-categories";
import { inferBrowseRegionFromMedia } from "@/lib/media-browse-regions";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let dryRun = false;
  try {
    const body = (await request.json()) as { dryRun?: boolean };
    dryRun = body.dryRun === true;
  } catch {
    /* default apply */
  }

  const db = getPrisma();
  const rows = await db.media.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      subCategory: true,
      tags: true,
      location: true,
      description: true,
      region: true,
      regionZone: true,
      city: true,
      district: true,
      mediaCategory: true,
      mediaMainCategory: true,
      mediaSubCategory: true,
      regionMain: true,
      regionSub: true,
    },
  });

  let updated = 0;
  const samples: { id: string; name: string }[] = [];

  for (const m of rows) {
    const cat = inferBrowseCategoryFromMedia({
      mediaCategory: m.mediaCategory,
      subCategory: m.subCategory,
      type: m.type,
      name: m.name,
      description: m.description ?? undefined,
      tags: m.tags,
    });
    const reg = inferBrowseRegionFromMedia({
      region: m.region,
      regionZone: m.regionZone,
      city: m.city,
      district: m.district,
      location: m.location,
    });

    const nextMain = m.mediaMainCategory ?? cat.main;
    const nextSub = m.mediaSubCategory ?? cat.sub;
    const nextRegionMain = m.regionMain ?? reg.main;
    const nextRegionSub = m.regionSub ?? reg.sub;
    const nextMediaCategory = mergeBrowseIntoMediaCategory(
      m.mediaCategory,
      nextMain,
      nextSub,
    );

    const changed =
      m.mediaMainCategory !== nextMain ||
      m.mediaSubCategory !== nextSub ||
      m.regionMain !== nextRegionMain ||
      m.regionSub !== nextRegionSub ||
      nextMediaCategory.join(",") !== m.mediaCategory.join(",");

    if (!changed) continue;
    updated += 1;
    if (samples.length < 5) samples.push({ id: m.id, name: m.name });

    if (!dryRun) {
      await db.media.update({
        where: { id: m.id },
        data: {
          mediaMainCategory: nextMain,
          mediaSubCategory: nextSub,
          regionMain: nextRegionMain,
          regionSub: nextRegionSub,
          mediaCategory: nextMediaCategory,
        },
      });
    }
  }

  return json({
    ok: true,
    dryRun,
    total: rows.length,
    updated,
    samples,
  });
}
