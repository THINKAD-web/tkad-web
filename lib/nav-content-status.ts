import { getPublishedAcademyLessonsForUi } from "@/lib/public-content-queries";
import { listPublishedReports } from "@/lib/report-queries";

export type NavContentStatus = {
  /** Published Report rows in DB */
  reportCount: number;
  /** Published AcademyLesson rows in DB */
  academyLessonCount: number;
};

export async function getNavContentStatus(): Promise<NavContentStatus> {
  const [{ total: reportCount }, academyLessons] = await Promise.all([
    listPublishedReports({ page: 1, pageSize: 1 }),
    getPublishedAcademyLessonsForUi(),
  ]);
  return {
    reportCount,
    academyLessonCount: academyLessons.length,
  };
}
