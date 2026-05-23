"use client";

import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { ProposalResultDisplay } from "@/components/proposal/proposal-result-display";
import type { CampaignProposalOutput, ProposalInput } from "@/lib/proposal/types";

type Props = {
  proposalId: string;
  brandName: string;
  campaignName: string;
  input: ProposalInput;
  proposal: CampaignProposalOutput;
  isKo: boolean;
  pageTitle: string;
};

export function ProposalSharePageClient({
  proposalId,
  brandName,
  campaignName,
  input,
  proposal,
  isKo,
  pageTitle,
}: Props) {
  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] bg-gray-50 pb-20 dark:bg-[#05050a]">
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="font-display text-xs font-medium uppercase tracking-[0.28em] text-cyan-300">
            THINKAD
          </p>
          <h1 className="mt-2 text-2xl font-bold dark:text-white text-gray-900 sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1 text-lg dark:text-white text-gray-700">{campaignName}</p>
          <p className="text-sm dark:text-white text-gray-400">{brandName}</p>
          <div className="mt-8">
            <ProposalResultDisplay
              input={input}
              proposal={proposal}
              proposalId={proposalId}
              isKo={isKo}
            />
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
