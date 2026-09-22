import type { Prisma } from "@prisma/client";

/** 검색 비교용 — 공백 제거 + lowercase */
export function normalizeSearchText(raw: string): string {
  return raw.replace(/\s+/g, "").toLowerCase();
}

/** 양쪽 공백 제거 후 haystack이 query를 포함하는지 */
export function collapsedTextContains(haystack: string, query: string): boolean {
  const h = normalizeSearchText(haystack);
  const q = normalizeSearchText(query);
  if (!q) return true;
  return h.includes(q);
}

const MEDIA_TEXT_SEARCH_FIELDS = [
  "name",
  "nameEn",
  "location",
  "district",
  "city",
  "region",
  "type",
] as const;

function fieldContains(term: string): Prisma.MediaWhereInput[] {
  return MEDIA_TEXT_SEARCH_FIELDS.map((field) => ({
    [field]: { contains: term, mode: "insensitive" as const },
  }));
}

/**
 * Prisma `contains` — 공백 토큰 AND (각 토큰이 임의 필드에 포함).
 * whole-string 단일 contains 보다 「강남 역」류 검색에 유리.
 */
export function buildPrismaMediaTextSearchWhere(
  rawQ: string,
): Prisma.MediaWhereInput | undefined {
  const trimmed = rawQ.trim();
  if (!trimmed) return undefined;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;

  if (tokens.length === 1) {
    return { OR: fieldContains(tokens[0]!) };
  }

  return {
    AND: tokens.map((token) => ({
      OR: fieldContains(token),
    })),
  };
}
