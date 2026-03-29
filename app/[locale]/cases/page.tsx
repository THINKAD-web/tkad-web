import { getPublishedSuccessCases } from "@/lib/public-content-queries";
import CasesPageClient from "./cases-page-client";

export default async function CasesPage() {
  const initialCases = await getPublishedSuccessCases();
  return <CasesPageClient initialCases={initialCases} />;
}
