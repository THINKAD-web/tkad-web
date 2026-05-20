import { Prisma } from "@prisma/client";
import {
  dbAcademyLessonToUi,
  successCaseToPublicDetail,
  successCaseToPublicListItem,
  trendReportToInsightReport,
} from "@/lib/content-mappers";
import type { InsightReport } from "@/lib/insights-reports";
import type { AcademyLesson } from "@/lib/academy-content";
import type {
  PublicSuccessCaseDetail,
  PublicSuccessCaseListItem,
} from "@/lib/success-case-public";
import prisma, { isDatabaseConfigured } from "@/lib/prisma";
import {
  isDatabaseAuthError,
  isDatabaseUnreachableError,
  isMissingContentTableError,
} from "@/lib/prisma-content-guards";
import {
  getSampleSuccessCaseDetail,
  getSampleSuccessCaseListItems,
  isSampleSuccessCaseId,
} from "@/lib/sample-success-case";
import { resolveCaseMediaLinks } from "@/lib/case-media-links";
import {
  filterCasesForMediaContext,
  type MediaCaseMatchContext,
} from "@/lib/success-case-media-match";

export async function getPublishedInsightReports(): Promise<InsightReport[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await prisma.trendReport.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { month: "desc" }],
    });
    return rows.map(trendReportToInsightReport);
  } catch (e) {
    if (isMissingContentTableError(e)) return [];
    if (isDatabaseAuthError(e)) return [];
    if (isDatabaseUnreachableError(e)) return [];
    throw e;
  }
}

export async function getPublishedAcademyLessonsForUi(): Promise<AcademyLesson[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await prisma.academyLesson.findMany({
      where: { status: "published" },
      orderBy: [{ courseId: "asc" }, { order: "asc" }, { updatedAt: "desc" }],
    });
    return rows.map(dbAcademyLessonToUi);
  } catch (e) {
    if (isMissingContentTableError(e)) return [];
    if (isDatabaseAuthError(e)) return [];
    if (isDatabaseUnreachableError(e)) return [];
    throw e;
  }
}

/**
 * 특정 매체에서 진행된 공개 사례 목록.
 * 1) DB `mediaIds` 직접 연결 2) 없으면 공개 목록·샘플에서 지명/역명 텍스트 매칭.
 */
export async function getSuccessCasesForMedia(
  mediaId: string,
  limit = 6,
  locale = "ko",
  mediaContext?: Omit<MediaCaseMatchContext, "mediaId">,
): Promise<PublicSuccessCaseListItem[]> {
  const ctx: MediaCaseMatchContext = { mediaId, ...mediaContext };

  const fallbackFromPool = async (): Promise<PublicSuccessCaseListItem[]> => {
    const pool = await getPublishedSuccessCases(locale);
    const matched = filterCasesForMediaContext(pool, ctx, limit);
    return matched.length > 0 ? matched : pool.slice(0, limit);
  };

  if (!isDatabaseConfigured()) {
    return fallbackFromPool();
  }

  try {
    const rows = await prisma.successCase.findMany({
      where: {
        status: "published",
        mediaIds: { has: mediaId },
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });
    const mapped = rows.map((row) => successCaseToPublicListItem(row, locale));
    if (mapped.length > 0) return mapped;
    return fallbackFromPool();
  } catch (e) {
    if (isMissingContentTableError(e)) return fallbackFromPool();
    if (isDatabaseAuthError(e)) return fallbackFromPool();
    if (isDatabaseUnreachableError(e)) return fallbackFromPool();
    throw e;
  }
}

async function enrichCaseMediaLinks(
  detail: PublicSuccessCaseDetail,
  locale: string,
): Promise<PublicSuccessCaseDetail> {
  const mediaLinks = await resolveCaseMediaLinks(
    detail.mediaIds,
    detail.mediaUsed,
    locale,
  );
  return { ...detail, mediaLinks };
}

/** 홈·허브용 최신 published N건 */
export async function getLatestPublishedSuccessCases(
  locale = "ko",
  limit = 3,
): Promise<PublicSuccessCaseListItem[]> {
  const all = await getPublishedSuccessCases(locale);
  return all.slice(0, limit);
}

export async function getPublishedSuccessCases(
  locale = "ko",
): Promise<PublicSuccessCaseListItem[]> {
  if (!isDatabaseConfigured()) {
    return getSampleSuccessCaseListItems(locale);
  }
  try {
    const rows = await prisma.successCase.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
    const mapped = rows.map((row) =>
      successCaseToPublicListItem(row, locale),
    );
    if (mapped.length === 0) {
      return getSampleSuccessCaseListItems(locale);
    }
    return mapped;
  } catch (e) {
    if (isMissingContentTableError(e)) {
      return getSampleSuccessCaseListItems(locale);
    }
    if (isDatabaseAuthError(e)) return getSampleSuccessCaseListItems(locale);
    if (isDatabaseUnreachableError(e)) return getSampleSuccessCaseListItems(locale);
    throw e;
  }
}

const CUID_RE = /^c[a-z0-9]{24,}$/i;

export async function getPublishedSuccessCaseById(
  id: string,
  locale = "ko",
): Promise<PublicSuccessCaseDetail | null> {
  const isSample = isSampleSuccessCaseId(id);
  if (!CUID_RE.test(id) && !isSample) return null;

  if (!isDatabaseConfigured()) {
    const sample = getSampleSuccessCaseDetail(id, locale);
    return sample ? enrichCaseMediaLinks(sample, locale) : null;
  }

  try {
    const row = await prisma.successCase.findFirst({
      where: { id, status: "published" },
    });
    if (row) {
      const detail = successCaseToPublicDetail(row, locale);
      return enrichCaseMediaLinks(detail, locale);
    }

    if (!isSample) return null;

    const publishedCount = await prisma.successCase.count({
      where: { status: "published" },
    });
    if (publishedCount === 0) {
      const sample = getSampleSuccessCaseDetail(id, locale);
      return sample ? enrichCaseMediaLinks(sample, locale) : null;
    }
    return null;
  } catch (e) {
    if (
      isMissingContentTableError(e) ||
      isDatabaseAuthError(e) ||
      isDatabaseUnreachableError(e)
    ) {
      const sample = getSampleSuccessCaseDetail(id, locale);
      return sample ? enrichCaseMediaLinks(sample, locale) : null;
    }
    throw e;
  }
}
