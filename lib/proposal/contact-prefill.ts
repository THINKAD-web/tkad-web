import type { ProposalInput, CampaignProposalOutput } from "@/lib/proposal/types";

export function buildProposalContactMessage(opts: {
  isKo: boolean;
  input: ProposalInput;
  proposal: CampaignProposalOutput;
  proposalId: string;
}): string {
  const { isKo, input, proposal, proposalId } = opts;
  const lines: string[] = [];

  lines.push(
    isKo
      ? "[AI 캠페인 제안서 — 견적 요청]"
      : "[AI Campaign Proposal — quote request]",
  );
  lines.push("");
  lines.push(
    isKo
      ? `제안서 ID: ${proposalId}`
      : `Proposal ID: ${proposalId}`,
  );
  lines.push(
    isKo
      ? `브랜드: ${input.brandName} · 캠페인: ${input.campaignName}`
      : `Brand: ${input.brandName} · Campaign: ${input.campaignName}`,
  );
  lines.push(
    isKo
      ? `업종: ${input.industry} · 예산: ${input.budgetManwon.toLocaleString("ko-KR")}만원`
      : `Industry: ${input.industry} · Budget: ${input.budgetManwon.toLocaleString("en-US")}×10k KRW`,
  );
  lines.push(
    isKo
      ? `집행: ${input.startDate} ~ ${input.endDate}`
      : `Flight: ${input.startDate} – ${input.endDate}`,
  );
  lines.push(
    isKo
      ? `지역: ${input.regions.join(", ")}`
      : `Regions: ${input.regions.join(", ")}`,
  );
  lines.push("");
  lines.push(isKo ? "— 제안 요약 —" : "— Summary —");
  lines.push(proposal.overview.slice(0, 800));
  lines.push("");
  lines.push(
    isKo
      ? `추천 매체: ${proposal.mediaMix.map((m) => m.mediaName).join(", ")}`
      : `Recommended media: ${proposal.mediaMix.map((m) => m.mediaName).join(", ")}`,
  );
  lines.push(
    isKo
      ? `예상 노출: ${proposal.metrics.estimatedImpressions.toLocaleString("ko-KR")} · CPM 약 ${proposal.metrics.estimatedCpm.toLocaleString("ko-KR")}원`
      : `Est. impressions: ${proposal.metrics.estimatedImpressions.toLocaleString("en-US")} · CPM ~₩${proposal.metrics.estimatedCpm.toLocaleString("en-US")}`,
  );

  return lines.join("\n");
}
