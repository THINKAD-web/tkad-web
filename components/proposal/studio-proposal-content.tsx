"use client";

import type {
  GeneralProposalOutput,
  ProposalSectionType,
  ProposalType,
  StudioProposalInput,
} from "@/lib/proposal/types";
import { PROPOSAL_TYPE_META, PROPOSAL_SECTION_META } from "@/lib/proposal/types";
import { BRAND_ACCENT } from "@/lib/brand-palette";

type Props = {
  input: StudioProposalInput;
  type: ProposalType;
  sections: ProposalSectionType[];
  output: GeneralProposalOutput;
  isKo: boolean;
};

const HERMES = BRAND_ACCENT;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-wide text-[color:var(--qp-accent)]">
      {children}
    </h2>
  );
}

const won = (n: number, isKo: boolean) => `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
const num = (n: number, isKo: boolean) => n.toLocaleString(isKo ? "ko-KR" : "en-US");

/** 범용 제안서 문서 렌더 — html-to-pdf 캡처 대상. Hermes 오렌지 + 그레이스케일 토큰. */
export function StudioProposalContent({ input, type, sections, output, isKo }: Props) {
  const meta = PROPOSAL_TYPE_META[type];
  const label = (s: ProposalSectionType) =>
    isKo ? PROPOSAL_SECTION_META[s].ko : PROPOSAL_SECTION_META[s].en;

  const renderSection = (s: ProposalSectionType) => {
    switch (s) {
      case "cover":
        return output.overview ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{output.overview}</p>
          </section>
        ) : null;
      case "market_analysis":
        return output.marketAnalysis ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{output.marketAnalysis}</p>
          </section>
        ) : null;
      case "strategy":
        return output.strategy ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{output.strategy}</p>
          </section>
        ) : null;
      case "media_recommend":
        return output.mediaMix && output.mediaMix.length ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#ddd] text-left text-[color:var(--qp-accent)]">
                  <th className="py-1 pr-2">{isKo ? "매체" : "Media"}</th>
                  <th className="py-1 pr-2">{isKo ? "역할" : "Role"}</th>
                  <th className="py-1 pr-2">{isKo ? "선정 이유" : "Rationale"}</th>
                  <th className="py-1">{isKo ? "비중" : "Share"}</th>
                </tr>
              </thead>
              <tbody>
                {output.mediaMix.map((r, i) => (
                  <tr key={r.mediaId + i} className="border-b border-[#eee] align-top">
                    <td className="py-2 pr-2 font-medium">{r.mediaName}</td>
                    <td className="py-2 pr-2">{r.role}</td>
                    <td className="py-2 pr-2 text-[#444]">{r.rationale}</td>
                    <td className="py-2 tabular-nums">{r.budgetSharePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null;
      case "competitor":
        return output.competitors && output.competitors.length ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <table className="mt-2 w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#ddd] text-left text-[color:var(--qp-accent)]">
                  <th className="py-1 pr-2">{isKo ? "경쟁사" : "Competitor"}</th>
                  <th className="py-1 pr-2">{isKo ? "접근" : "Approach"}</th>
                  <th className="py-1">{isKo ? "차별화 포인트" : "Differentiation"}</th>
                </tr>
              </thead>
              <tbody>
                {output.competitors.map((c, i) => (
                  <tr key={c.name + i} className="border-b border-[#eee] align-top">
                    <td className="py-2 pr-2 font-medium">{c.name}</td>
                    <td className="py-2 pr-2 text-[#444]">{c.approach}</td>
                    <td className="py-2 text-[#444]">{c.differentiation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null;
      case "case_study":
        return output.caseStudies && output.caseStudies.length ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <ul className="mt-2 space-y-2 text-sm">
              {output.caseStudies.map((c, i) => (
                <li key={i} className="rounded-lg border border-[#eee] bg-gray-50 p-3">
                  <p className="font-semibold">{c.title}</p>
                  <p className="mt-0.5 text-[#444]">{c.summary}</p>
                  {c.result ? (
                    <p className="mt-1 text-xs font-semibold text-[color:var(--qp-accent)]">
                      {isKo ? "성과" : "Result"}: {c.result}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null;
      case "roi_scenario":
        return output.roiScenarios && output.roiScenarios.length ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {output.roiScenarios.map((r) => (
                <div
                  key={r.scenario}
                  className={
                    "rounded-lg border p-3 text-xs " +
                    (r.scenario === "base"
                      ? "border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent)]/5"
                      : "border-[#e5e7eb] bg-white")
                  }
                >
                  <p className="font-bold" style={{ color: HERMES }}>{r.label}</p>
                  <p className="mt-1.5 text-[#444]">
                    {isKo ? "노출" : "Impr."} <b className="tabular-nums">{num(r.impressions, isKo)}</b>
                  </p>
                  <p className="text-[#444]">
                    {isKo ? "도달" : "Reach"} <b className="tabular-nums">{num(r.reach, isKo)}</b>
                  </p>
                  {r.conversions != null ? (
                    <p className="text-[#444]">
                      {isKo ? "전환" : "Conv."} <b className="tabular-nums">{num(r.conversions, isKo)}</b>
                    </p>
                  ) : null}
                  {r.note ? <p className="mt-1 text-[10px] text-[#888]">{r.note}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null;
      case "budget":
        return (output.budgetAllocation && output.budgetAllocation.length) || output.metrics ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            {output.budgetAllocation && output.budgetAllocation.length ? (
              <ul className="mt-2 space-y-1 text-sm">
                {output.budgetAllocation.map((row, i) => (
                  <li key={i}>
                    {row.label}: {won(row.amountWon, isKo)} ({row.sharePct}%)
                  </li>
                ))}
              </ul>
            ) : null}
            {output.metrics ? (
              <p className="mt-2 text-sm text-[#444]">
                {isKo ? "예상 노출" : "Impr."} {num(output.metrics.estimatedImpressions, isKo)} ·{" "}
                {isKo ? "도달" : "Reach"} {num(output.metrics.estimatedReach, isKo)} · CPM{" "}
                {won(output.metrics.estimatedCpm, isKo)}
              </p>
            ) : null}
          </section>
        ) : null;
      case "timeline":
        return output.timeline && output.timeline.length ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <ul className="mt-2 space-y-3 text-sm">
              {output.timeline.map((item, i) => (
                <li key={i}>
                  <p className="font-semibold">
                    {item.phase} ({item.period})
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-[#444]">
                    {item.tasks.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {output.expectedOutcomes && output.expectedOutcomes.length ? (
              <div className="mt-3">
                <p className="text-xs font-bold text-[color:var(--qp-accent)]">{isKo ? "기대 효과" : "Expected outcomes"}</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-[#444]">
                  {output.expectedOutcomes.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null;
      case "appendix":
        return output.appendix ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#555]">{output.appendix}</p>
          </section>
        ) : null;
    }
  };

  return (
    <div className="bg-white p-8 text-[#111]">
      <header className="border-b-2 border-[color:var(--qp-accent)] pb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--qp-accent)]">
          THINKAD · 싱커드 · {isKo ? meta.ko : meta.en}
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          {input.campaignName || `${input.brandName} ${isKo ? "제안서" : "Proposal"}`}
        </h1>
        <p className="text-sm text-[#444]">
          {input.brandName} · {input.industry}
        </p>
        {input.startDate || input.budgetManwon ? (
          <p className="mt-2 text-sm">
            {input.startDate && input.endDate ? `${input.startDate} — ${input.endDate}` : ""}
            {input.budgetManwon
              ? `${input.startDate ? " · " : ""}${isKo ? `${num(input.budgetManwon, isKo)}만원` : `${input.budgetManwon}×10k KRW`}`
              : ""}
          </p>
        ) : null}
      </header>

      {sections.map(renderSection)}

      <footer className="mt-10 border-t border-[#ccc] pt-4 text-[10px] text-[#666]">
        THINKAD (싱커드) · sales@tkad.co.kr · 02-515-2772
      </footer>
    </div>
  );
}
