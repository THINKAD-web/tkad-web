import type { PrismaClient } from "@prisma/client";
import {
  flattenMediaCategories,
  TARGET_CATEGORIES,
} from "@/lib/media-categories";

/** MediaCategory · TargetCategory 테이블 upsert */
export async function seedMediaCategories(db: PrismaClient): Promise<void> {
  const nodes = flattenMediaCategories();
  for (const node of nodes) {
    await db.mediaCategory.upsert({
      where: { slug: node.slug },
      create: {
        id: node.id,
        slug: node.slug,
        name: node.nameKo,
        parentId: node.parentId ?? null,
        icon: node.icon ?? null,
        description: node.descriptionKo ?? null,
        order: node.order,
      },
      update: {
        name: node.nameKo,
        parentId: node.parentId ?? null,
        icon: node.icon ?? null,
        description: node.descriptionKo ?? null,
        order: node.order,
      },
    });
  }

  for (const t of TARGET_CATEGORIES) {
    await db.targetCategory.upsert({
      where: { slug: t.slug },
      create: {
        id: t.id,
        slug: t.slug,
        name: t.nameKo,
        description: t.descriptionKo ?? null,
        icon: t.icon ?? null,
        order: t.order,
      },
      update: {
        name: t.nameKo,
        description: t.descriptionKo ?? null,
        icon: t.icon ?? null,
        order: t.order,
      },
    });
  }
}
