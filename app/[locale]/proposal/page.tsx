import { Suspense } from "react";
import ProposalWizardClient from "@/components/proposal/proposal-wizard-client";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";

export const revalidate = 3600;

export default async function ProposalPage() {
  const catalog = await fetchPublicMediaCatalog();
  return (
    <Suspense fallback={null}>
      <ProposalWizardClient catalog={catalog} />
    </Suspense>
  );
}
