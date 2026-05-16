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
  getSampleSuccessCaseDetail,
  getSampleSuccessCaseListItems,
  isSampleSuccessCaseId,
} from "@/lib/sample-success-case";
import { resolveCaseMediaLinks } from "@/lib/case-media-links";

/**
 * 콘텐츠 테이블/컬럼이 누락된 환경(예: 마이그레이션 미실행)에서도 빌드와 SSR 이
 * graceful 하게 통과하도록 잡는 가드. 새 컬럼이 schema.prisma 에 추가됐지만
 * Neon SQL editor 에서 idempotent SQL 이 아직 실행되지 않은 시점에 발생.
 *
 * Prisma 코드:
 *   - P2021: table does not exist
 *   - P2022: column does not exist
 *   - DriverAdapterError: ColumnNotFound (pg adapter 메시지)
 */
function isMissingContentTableError(e: unknown): boolean {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === "P2021" || e.code === "P2022")
  ) {
    return true;
  }
  if (e instanceof Error) {
    const msg = e.message || "";
    if (/column .* does not exist/i.test(msg)) return true;
    if (/ColumnNotFound|UndefinedColumn/i.test(msg)) return true;
  }
  return false;
}

function isDatabaseAuthError(e: unknown): boolean {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    // P1000: Authentication failed against the database server
    e.code === "P1000"
  ) {
    return true;
  }
  if (e instanceof Error) {
    const msg = e.message || "";
    if (/Authentication failed against the database server/i.test(msg)) return true;
    if (/AuthenticationFailed/i.test(msg)) return true;
  }
  return false;
}

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
    throw e;
  }
}

/**
 * 특정 매체에서 진행된 공개 사례 목록 (mediaIds 배열 contains 검색).
 * 비활성·미입력 사례는 제외. 결과 0건이면 매체 상세에서 섹션 자체 숨김.
 */
export async function getSuccessCasesForMedia(
  mediaId: string,
  limit = 6,
): Promise<PublicSuccessCaseListItem[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const rows = await prisma.successCase.findMany({
      where: {
        status: "published",
        mediaIds: { has: mediaId },
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });
    return rows.map((row) => successCaseToPublicListItem(row));
  } catch (e) {
    if (isMissingContentTableError(e)) return [];
    if (isDatabaseAuthError(e)) return [];
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
    if (isMissingContentTableError(e) || isDatabaseAuthError(e)) {
      const sample = getSampleSuccessCaseDetail(id, locale);
      return sample ? enrichCaseMediaLinks(sample, locale) : null;
    }
    throw e;
  }
}
