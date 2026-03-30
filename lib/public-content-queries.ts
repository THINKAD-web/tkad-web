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
  getSampleSuccessCaseListItem,
  SAMPLE_SUCCESS_CASE_ID,
} from "@/lib/sample-success-case";

export async function getPublishedInsightReports(): Promise<InsightReport[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await prisma.trendReport.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { month: "desc" }],
  });
  return rows.map(trendReportToInsightReport);
}

export async function getPublishedAcademyLessonsForUi(): Promise<AcademyLesson[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await prisma.academyLesson.findMany({
    where: { status: "published" },
    orderBy: [{ courseId: "asc" }, { order: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(dbAcademyLessonToUi);
}

export async function getPublishedSuccessCases(): Promise<
  PublicSuccessCaseListItem[]
> {
  if (!isDatabaseConfigured()) {
    return [getSampleSuccessCaseListItem()];
  }
  const rows = await prisma.successCase.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  const mapped = rows.map(successCaseToPublicListItem);
  if (mapped.length === 0) {
    return [getSampleSuccessCaseListItem()];
  }
  return mapped;
}

const CUID_RE = /^c[a-z0-9]{24,}$/i;

export async function getPublishedSuccessCaseById(
  id: string,
): Promise<PublicSuccessCaseDetail | null> {
  if (!CUID_RE.test(id)) return null;

  if (!isDatabaseConfigured()) {
    return id === SAMPLE_SUCCESS_CASE_ID ? getSampleSuccessCaseDetail() : null;
  }

  const row = await prisma.successCase.findFirst({
    where: { id, status: "published" },
  });
  if (row) return successCaseToPublicDetail(row);

  if (id !== SAMPLE_SUCCESS_CASE_ID) return null;

  const publishedCount = await prisma.successCase.count({
    where: { status: "published" },
  });
  return publishedCount === 0 ? getSampleSuccessCaseDetail() : null;
}
