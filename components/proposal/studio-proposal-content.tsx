"use client";

import type {
  GeneralProposalOutput,
  ProposalSectionType,
  ProposalType,
  StudioProposalInput,
} from "@/lib/proposal/types";
import { PROPOSAL_TYPE_META, PROPOSAL_SECTION_META } from "@/lib/proposal/types";

type Props = {
  input: StudioProposalInput;
  type: ProposalType;
  sections: ProposalSectionType[];
  output: GeneralProposalOutput;
  isKo: boolean;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="tkad-type-label text-primary">{children}</h2>
  );
}

const won = (n: number, isKo: boolean) => `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
const num = (n: number, isKo: boolean) => n.toLocaleString(isKo ? "ko-KR" : "en-US");

/** 범용 제안서 문서 렌더 — html-to-pdf 캡처 대상. shadcn semantic + tkad-type SSOT. */
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
            <p className="tkad-type-body mt-2 whitespace-pre-wrap">{output.overview}</p>
          </section>
        ) : null;
      case "market_analysis":
        return output.marketAnalysis ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <p className="tkad-type-body mt-2 whitespace-pre-wrap">{output.marketAnalysis}</p>
          </section>
        ) : null;
      case "strategy":
        return output.strategy ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <p className="tkad-type-body mt-2 whitespace-pre-wrap">{output.strategy}</p>
          </section>
        ) : null;
      case "media_recommend":
        return output.mediaMix && output.mediaMix.length ? (
          <section key={s} className="mt-6">
            <SectionTitle>{label(s)}</SectionTitle>
            <table className="tkad-type-meta mt-2 w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-primary">
                  <th className="py-1 pr-2">{isKo ? "매체" : "Media"}</th>
                  <th className="py-1 pr-2">{isKo ? "역할" : "Role"}</th>
                  <th className="py-1 pr-2">{isKo ? "선정 이유" : "Rationale"}</th>
                  <th className="py-1">{isKo ? "비중" : "Share"}</th>
                </tr>
              </thead>
              <tbody>
                {output.mediaMix.map((r, i) => (
                  <tr key={r.mediaId + i} className="border-b border-border align-top">
                    <td className="py-2 pr-2 font-medium text-foreground">{r.mediaName}</td>
                    <td className="py-2 pr-2 text-foreground">{r.role}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{r.rationale}</td>
                    <td className="py-2 tabular-nums text-foreground">{r.budgetSharePct}%</td>
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
            <table className="tkad-type-meta mt-2 w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-primary">
                  <th className="py-1 pr-2">{isKo ? "경쟁사" : "Competitor"}</th>
                  <th className="py-1 pr-2">{isKo ? "접근" : "Approach"}</th>
                  <th className="py-1">{isKo ? "차별화 포인트" : "Differentiation"}</th>
                </tr>
              </thead>
              <tbody>
                {output.competitors.map((c, i) => (
                  <tr key={c.name + i} className="border-b border-border align-top">
                    <td className="py-2 pr-2 font-medium text-foreground">{c.name}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{c.approach}</td>
                    <td className="py-2 text-muted-foreground">{c.differentiation}</td>
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
            <ul className="mt-2 space-y-2">
              {output.caseStudies.map((c, i) => (
                <li key={i} className="rounded-lg border border-border bg-muted p-3">
                  <p className="tkad-type-title">{c.title}</p>
                  <p className="tkad-type-body mt-0.5">{c.summary}</p>
                  {c.result ? (
                    <p className="tkad-type-meta mt-1 font-semibold text-accent">
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
                    "tkad-type-meta rounded-lg border p-3 " +
                    (r.scenario === "base"
                      ? "border-accent/40 bg-accent/5"
                      : "border-border bg-card")
                  }
                >
                  <p className="tkad-type-title text-accent">{r.label}</p>
                  <p className="tkad-type-body mt-1.5">
                    {isKo ? "노출" : "Impr."}{" "}
                    <b className="tabular-nums text-foreground">{num(r.impressions, isKo)}</b>
                  </p>
                  <p className="tkad-type-body">
                    {isKo ? "도달" : "Reach"}{" "}
                    <b className="tabular-nums text-foreground">{num(r.reach, isKo)}</b>
                  </p>
                  {r.conversions != null ? (
                    <p className="tkad-type-body">
                      {isKo ? "전환" : "Conv."}{" "}
                      <b className="tabular-nums text-foreground">{num(r.conversions, isKo)}</b>
                    </p>
                  ) : null}
                  {r.note ? <p className="tkad-type-meta mt-1">{r.note}</p> : null}
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
              <ul className="tkad-type-body mt-2 space-y-1">
                {output.budgetAllocation.map((row, i) => (
                  <li key={i}>
                    {row.label}: {won(row.amountWon, isKo)} ({row.sharePct}%)
                  </li>
                ))}
              </ul>
            ) : null}
            {output.metrics ? (
              <p className="tkad-type-body mt-2 text-muted-foreground">
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
            <ul className="tkad-type-body mt-2 space-y-3">
              {output.timeline.map((item, i) => (
                <li key={i}>
                  <p className="tkad-type-title">{item.phase} ({item.period})</p>
                  <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                    {item.tasks.map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {output.expectedOutcomes && output.expectedOutcomes.length ? (
              <div className="mt-3">
                <p className="tkad-type-label text-primary">
                  {isKo ? "기대 효과" : "Expected outcomes"}
                </p>
                <ul className="tkad-type-body mt-1 list-disc pl-5 text-muted-foreground">
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
            <p className="tkad-type-meta mt-2 whitespace-pre-wrap">{output.appendix}</p>
          </section>
        ) : null;
    }
  };

  return (
    <div className="bg-card p-8 text-foreground">
      <header className="border-b-2 border-primary pb-4">
        <p className="tkad-type-label text-primary">
          THINKAD · 싱커드 · {isKo ? meta.ko : meta.en}
        </p>
        <h1 className="tkad-type-title mt-2">
          {input.campaignName || `${input.brandName} ${isKo ? "제안서" : "Proposal"}`}
        </h1>
        <p className="tkad-type-body text-muted-foreground">
          {input.brandName} · {input.industry}
        </p>
        {input.startDate || input.budgetManwon ? (
          <p className="tkad-type-body mt-2">
            {input.startDate && input.endDate ? `${input.startDate} — ${input.endDate}` : ""}
            {input.budgetManwon
              ? `${input.startDate ? " · " : ""}${isKo ? `${num(input.budgetManwon, isKo)}만원` : `${input.budgetManwon}×10k KRW`}`
              : ""}
          </p>
        ) : null}
      </header>

      {sections.map(renderSection)}

      <footer className="tkad-type-meta mt-10 border-t border-border pt-4">
        THINKAD (싱커드) · sales@tkad.co.kr · 02-515-2772
      </footer>
    </div>
  );
}
