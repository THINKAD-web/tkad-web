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
    return rows.map(successCaseToPublicListItem);
  } catch (e) {
    if (isMissingContentTableError(e)) return [];
    if (isDatabaseAuthError(e)) return [];
    throw e;
  }
}

export async function getPublishedSuccessCases(): Promise<
  PublicSuccessCaseListItem[]
> {
  if (!isDatabaseConfigured()) {
    return getSampleSuccessCaseListItems();
  }
  try {
    const rows = await prisma.successCase.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
    const mapped = rows.map(successCaseToPublicListItem);
    if (mapped.length === 0) {
      return getSampleSuccessCaseListItems();
    }
    return mapped;
  } catch (e) {
    if (isMissingContentTableError(e)) return getSampleSuccessCaseListItems();
    if (isDatabaseAuthError(e)) return getSampleSuccessCaseListItems();
    throw e;
  }
}

const CUID_RE = /^c[a-z0-9]{24,}$/i;

export async function getPublishedSuccessCaseById(
  id: string,
): Promise<PublicSuccessCaseDetail | null> {
  if (!CUID_RE.test(id)) return null;

  if (!isDatabaseConfigured()) {
    return getSampleSuccessCaseDetail(id);
  }

  try {
    const row = await prisma.successCase.findFirst({
      where: { id, status: "published" },
    });
    if (row) return successCaseToPublicDetail(row);

    if (!isSampleSuccessCaseId(id)) return null;

    const publishedCount = await prisma.successCase.count({
      where: { status: "published" },
    });
    return publishedCount === 0 ? getSampleSuccessCaseDetail(id) : null;
  } catch (e) {
    if (isMissingContentTableError(e)) return getSampleSuccessCaseDetail(id);
    if (isDatabaseAuthError(e)) return getSampleSuccessCaseDetail(id);
    throw e;
  }
}
