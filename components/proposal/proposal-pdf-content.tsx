"use client";

import type { CampaignProposalOutput, ProposalInput } from "@/lib/proposal/types";

type Props = {
  input: ProposalInput;
  proposal: CampaignProposalOutput;
  isKo: boolean;
};

export function ProposalPdfContent({ input, proposal, isKo }: Props) {
  return (
    <div className="bg-white p-8 text-[#111]">
      <header className="border-b-2 border-[#111] pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#555]">
          THINKAD · 싱커드
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {isKo ? "캠페인 제안서" : "Campaign Proposal"}
        </h1>
        <p className="mt-1 text-lg font-semibold">{input.campaignName}</p>
        <p className="text-sm text-[#444]">
          {input.brandName} · {input.industry}
        </p>
        <p className="mt-2 text-sm">
          {input.startDate} — {input.endDate} ·{" "}
          {isKo
            ? `${input.budgetManwon.toLocaleString("ko-KR")}만원`
            : `${input.budgetManwon}×10k KRW`}
        </p>
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {isKo ? "캠페인 개요" : "Overview"}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {proposal.overview}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {isKo ? "전략 방향" : "Strategy"}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {proposal.strategy}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {isKo ? "추천 매체 믹스" : "Media mix"}
        </h2>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#ccc] text-left">
              <th className="py-1 pr-2">{isKo ? "매체" : "Media"}</th>
              <th className="py-1 pr-2">{isKo ? "역할" : "Role"}</th>
              <th className="py-1">{isKo ? "비중" : "Share"}</th>
            </tr>
          </thead>
          <tbody>
            {proposal.mediaMix.map((row) => (
              <tr key={row.mediaId} className="border-b border-[#eee]">
                <td className="py-2 pr-2 font-medium">{row.mediaName}</td>
                <td className="py-2 pr-2">{row.role}</td>
                <td className="py-2">{row.budgetSharePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {isKo ? "예산 배분" : "Budget"}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {proposal.budgetAllocation.map((row, i) => (
            <li key={i}>
              {row.label}: ₩{row.amountWon.toLocaleString(isKo ? "ko-KR" : "en-US")}{" "}
              ({row.sharePct}%)
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {isKo ? "예상 KPI" : "Estimated KPIs"}
        </h2>
        <p className="mt-2 text-sm">
          {isKo ? "노출" : "Impressions"}:{" "}
          {proposal.metrics.estimatedImpressions.toLocaleString(
            isKo ? "ko-KR" : "en-US",
          )}
          {" · "}
          {isKo ? "도달" : "Reach"}:{" "}
          {proposal.metrics.estimatedReach.toLocaleString(
            isKo ? "ko-KR" : "en-US",
          )}
          {" · "}
          CPM: ₩
          {proposal.metrics.estimatedCpm.toLocaleString(
            isKo ? "ko-KR" : "en-US",
          )}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {isKo ? "집행 타임라인" : "Timeline"}
        </h2>
        <ul className="mt-2 space-y-3 text-sm">
          {proposal.timeline.map((item, i) => (
            <li key={i}>
              <p className="font-semibold">
                {item.phase} ({item.period})
              </p>
              <ul className="mt-1 list-disc pl-4">
                {item.tasks.map((task, j) => (
                  <li key={j}>{task}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {isKo ? "기대 효과" : "Expected outcomes"}
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {proposal.expectedOutcomes.map((line, i) => (
            <li key={i} className="mt-1">
              {line}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 border-t border-[#ccc] pt-4 text-[10px] text-[#666]">
        THINKAD (싱커드) · sales@tkad.co.kr · 02-515-2772
      </footer>
    </div>
  );
}
