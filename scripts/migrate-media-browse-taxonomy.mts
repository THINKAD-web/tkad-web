import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

import {
  inferBrowseCategoryFromMedia,
  mergeBrowseIntoMediaCategory,
} from "@/lib/media-browse-categories";
import { inferBrowseRegionFromMedia } from "@/lib/media-browse-regions";
import { getPrisma } from "@/lib/prisma";

const apply = process.argv.includes("--apply");

async function main() {
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

  let wouldUpdate = 0;
  let updated = 0;

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
    wouldUpdate += 1;

    if (apply) {
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
      updated += 1;
    }
  }

  console.log(
    apply
      ? `Applied browse taxonomy to ${updated} / ${rows.length} media rows.`
      : `Dry run: ${wouldUpdate} / ${rows.length} rows would update. Pass --apply to write.`,
  );

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
