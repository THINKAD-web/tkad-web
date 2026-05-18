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
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] bg-[#05050a] pb-20">
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
            THINKAD
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-1 text-lg text-white/80">{campaignName}</p>
          <p className="text-sm text-white/50">{brandName}</p>
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
