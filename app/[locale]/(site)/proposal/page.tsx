import { Suspense } from "react";
import ProposalWizardClient from "@/components/proposal/proposal-wizard-client";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";

export const dynamic = "force-dynamic";

export default async function ProposalPage() {
  const catalog = await fetchPublicMediaCatalogList();
  return (
    <Suspense fallback={null}>
      <ProposalWizardClient catalog={catalog} />
    </Suspense>
  );
}
