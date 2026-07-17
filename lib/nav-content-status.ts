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
  // 이 값은 site-header(모든 공개 페이지 chrome)에서 호출되므로,
  // 페이지별 revalidate 의 "실효 하한"이 된다. 300s 로 두면 매체 상세 등
  // 모든 정적 페이지의 effective revalidate 가 300s 로 캡되어 ISR write 가
  // 과도하게 발생한다(ISR Writes 진단의 실제 근본 원인). nav 콘텐츠(리포트·
  // 아카데미 카운트)는 변동이 드무므로 1h 로 상향한다.
  { revalidate: 3600, tags: ["nav-content-status"] },
);

export async function getNavContentStatus(): Promise<NavContentStatus> {
  return getCachedNavContentStatus();
}
