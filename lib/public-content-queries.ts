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

/** When content tables are missing (P2021), fall back so SSG/build still succeeds. */
function isMissingContentTableError(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021"
  );
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
    throw e;
  }
}
