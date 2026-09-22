import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  buildPrismaMediaTextSearchWhere,
  normalizeSearchText,
} from "@/lib/media-search-text";

const COLLAPSED_SEARCH_LIMIT = 5000;

/**
 * DB 문자열에서 공백 제거 후 collapsed query 매칭 (홍대상진빌딩 ↔ 홍대 상진빌딩).
 */
export async function findMediaIdsByCollapsedTextSearch(
  db: Pick<PrismaClient, "$queryRaw">,
  rawQ: string,
  limit = COLLAPSED_SEARCH_LIMIT,
): Promise<string[]> {
  const needle = normalizeSearchText(rawQ);
  if (needle.length < 2) return [];

  const pattern = `%${needle}%`;
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM media
    WHERE regexp_replace(lower(coalesce(name, '')), '\\s', '', 'g') LIKE ${pattern}
       OR regexp_replace(lower(coalesce(name_en, '')), '\\s', '', 'g') LIKE ${pattern}
       OR regexp_replace(lower(coalesce(location, '')), '\\s', '', 'g') LIKE ${pattern}
       OR regexp_replace(lower(coalesce(district, '')), '\\s', '', 'g') LIKE ${pattern}
       OR regexp_replace(lower(coalesce(city, '')), '\\s', '', 'g') LIKE ${pattern}
       OR regexp_replace(lower(coalesce(region, '')), '\\s', '', 'g') LIKE ${pattern}
    LIMIT ${limit}
  `);
  return rows.map((r) => r.id);
}

export async function buildAdminMediaListTextSearchWhere(
  db: Pick<PrismaClient, "$queryRaw">,
  rawQ: string | undefined | null,
): Promise<Prisma.MediaWhereInput | undefined> {
  const q = rawQ?.trim();
  if (!q) return undefined;

  const tokenWhere = buildPrismaMediaTextSearchWhere(q);
  if (!tokenWhere) return undefined;

  const collapsedIds = await findMediaIdsByCollapsedTextSearch(db, q);
  if (collapsedIds.length === 0) return tokenWhere;

  return {
    OR: [tokenWhere, { id: { in: collapsedIds } }],
  };
}
