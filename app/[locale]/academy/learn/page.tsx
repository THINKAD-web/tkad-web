import { getPublishedAcademyLessonsForUi } from "@/lib/public-content-queries";
import AcademyPageClient from "../academy-page-client";

export const dynamic = "force-dynamic";

export default async function AcademyLearnPage() {
  const dbLessons = await getPublishedAcademyLessonsForUi();
  return <AcademyPageClient dbLessons={dbLessons} />;
}
