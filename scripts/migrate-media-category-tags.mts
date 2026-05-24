import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.development"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
config({ path: resolve(root, ".env.development.local"), override: true });

import {
  inferMediaCategoriesFromText,
  inferTargetCategoriesFromText,
} from "@/lib/media-categories";
import { seedMediaCategories } from "@/lib/seed-media-categories";
import { getPrisma } from "@/lib/prisma";

async function main() {
  const db = getPrisma();

  console.log("Seeding category taxonomy…");
  await seedMediaCategories(db);

  const rows = await db.media.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      subCategory: true,
      tags: true,
      location: true,
      description: true,
      targetAge: true,
      mediaCategory: true,
      targetCategory: true,
    },
  });

  let updated = 0;
  for (const m of rows) {
    const mediaCategory =
      m.mediaCategory.length > 0
        ? m.mediaCategory
        : inferMediaCategoriesFromText({
            name: m.name,
            type: m.type,
            subCategory: m.subCategory ?? undefined,
            tags: m.tags,
            location: m.location,
            description: m.description ?? undefined,
          });
    const targetCategory =
      m.targetCategory.length > 0
        ? m.targetCategory
        : inferTargetCategoriesFromText({
            name: m.name,
            tags: m.tags,
            targetAge: m.targetAge ?? undefined,
            description: m.description ?? undefined,
          });

    if (
      mediaCategory.join(",") !== m.mediaCategory.join(",") ||
      targetCategory.join(",") !== m.targetCategory.join(",")
    ) {
      await db.media.update({
        where: { id: m.id },
        data: { mediaCategory, targetCategory },
      });
      updated += 1;
    }
  }

  console.log(`Migrated ${updated} / ${rows.length} media rows.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
