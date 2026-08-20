import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import type { CaseStudyMediaLink } from "@/lib/success-case-public";
import { publicActiveMediaWhere } from "@/lib/media-review-status";

/**
 * `mediaIds`로 카탈로그 매체명을 조회해 상세 페이지 링크 라벨을 보강합니다.
 */
export async function resolveCaseMediaLinks(
  mediaIds: string[],
  mediaUsed: string[],
  locale: string,
): Promise<CaseStudyMediaLink[]> {
  const isKo = locale !== "en";
  if (!mediaIds.length) {
    return mediaUsed.map((label) => ({ label }));
  }

  if (!isDatabaseConfigured()) {
    return mediaIds.map((id, i) => ({
      id,
      label: mediaUsed[i] ?? id,
    }));
  }

  try {
    const db = getPrisma();
    const rows = await db.media.findMany({
      where: publicActiveMediaWhere({ id: { in: mediaIds } }),
      select: { id: true, name: true, nameEn: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    return mediaIds.map((id, i) => {
      const m = byId.get(id);
      const fallback = mediaUsed[i] ?? id;
      if (!m) return { id, label: fallback };
      const label = isKo ? m.name : m.nameEn?.trim() || m.name;
      return { id, label };
    });
  } catch {
    return mediaIds.map((id, i) => ({
      id,
      label: mediaUsed[i] ?? id,
    }));
  }
}
