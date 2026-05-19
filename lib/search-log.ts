import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { normalizeSearchQuery } from "@/lib/search-text";

export async function logSearchQuery(params: {
  query: string;
  locale?: string;
  resultCount: number;
  userId?: string | null;
}): Promise<void> {
  const query = normalizeSearchQuery(params.query);
  if (!query || !isDatabaseConfigured()) return;

  try {
    const db = getPrisma();
    await db.searchLog.create({
      data: {
        query,
        locale: params.locale ?? "ko",
        resultCount: params.resultCount,
        userId: params.userId ?? undefined,
      },
    });
  } catch (e) {
    console.error("[search-log]", e);
  }
}
