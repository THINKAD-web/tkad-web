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
  if (!isDatabaseConfigured()) return [];
  const rows = await prisma.successCase.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(successCaseToPublicListItem);
}

const CUID_RE = /^c[a-z0-9]{24,}$/i;

export async function getPublishedSuccessCaseById(
  id: string,
): Promise<PublicSuccessCaseDetail | null> {
  if (!isDatabaseConfigured() || !CUID_RE.test(id)) return null;
  const row = await prisma.successCase.findFirst({
    where: { id, status: "published" },
  });
  if (!row) return null;
  return successCaseToPublicDetail(row);
}
