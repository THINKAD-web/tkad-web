import type { PrismaClient } from "@prisma/client";
import { generateMediaSlug } from "@/lib/slug";

/** Load existing slugs and assign a unique slug for a new or renamed media row. */
export async function assignUniqueMediaSlug(
  db: PrismaClient,
  name: string,
  nameEn: string | null | undefined,
  excludeId?: string,
): Promise<string> {
  const rows = await db.media.findMany({
    where: {
      slug: { not: null },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });
  const used = new Set(
    rows.map((r) => r.slug?.trim()).filter((s): s is string => Boolean(s)),
  );
  return generateMediaSlug(name, nameEn, used);
}
