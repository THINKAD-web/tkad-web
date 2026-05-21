import { listAcademyDownloadAssetUrls } from "@/lib/academy-download-assets";
import { getPublishedAcademyLessonsForUi } from "@/lib/public-content-queries";
import AcademyPageClient from "./academy-page-client";

export const dynamic = "force-dynamic";

export default async function AcademyPage() {
  const [dbLessons, downloadPdfUrls] = await Promise.all([
    getPublishedAcademyLessonsForUi(),
    listAcademyDownloadAssetUrls(),
  ]);
  return (
    <AcademyPageClient
      dbLessons={dbLessons}
      downloadPdfUrls={downloadPdfUrls}
    />
  );
}
