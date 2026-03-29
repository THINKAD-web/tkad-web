import { getPublishedInsightReports } from "@/lib/public-content-queries";
import InsightsPageClient from "./insights-page-client";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const initialReports = await getPublishedInsightReports();
  return <InsightsPageClient initialReports={initialReports} />;
}
