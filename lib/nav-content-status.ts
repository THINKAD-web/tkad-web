import { unstable_cache } from "next/cache";
import { getPublishedAcademyLessonsForUi } from "@/lib/public-content-queries";
import { listPublishedReports } from "@/lib/report-queries";

export type NavContentStatus = {
  /** Published Report rows in DB */
  reportCount: number;
  /** Published AcademyLesson rows in DB */
  academyLessonCount: number;
};

async function loadNavContentStatus(): Promise<NavContentStatus> {
  try {
    const [{ total: reportCount }, academyLessons] = await Promise.all([
      listPublishedReports({ page: 1, pageSize: 1 }),
      getPublishedAcademyLessonsForUi(),
    ]);
    return {
      reportCount,
      academyLessonCount: academyLessons.length,
    };
  } catch {
    return { reportCount: 0, academyLessonCount: 0 };
  }
}

const getCachedNavContentStatus = unstable_cache(
  loadNavContentStatus,
  ["nav-content-status"],
  { revalidate: 300 },
);

export async function getNavContentStatus(): Promise<NavContentStatus> {
  return getCachedNavContentStatus();
}
