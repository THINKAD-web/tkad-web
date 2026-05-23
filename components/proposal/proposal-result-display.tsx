"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, MessageCircle, Share2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";
import { proposalPdfFilename } from "@/lib/proposal/pdf-filename";
import type { CampaignProposalOutput, ProposalInput } from "@/lib/proposal/types";
import { ProposalPdfContent } from "@/components/proposal/proposal-pdf-content";
import { cn } from "@/lib/utils";

const glassCard =
  "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur";

type Props = {
  input: ProposalInput;
  proposal: CampaignProposalOutput;
  proposalId: string | null;
  sharePath?: string;
  isKo: boolean;
};

export function ProposalResultDisplay({
  input,
  proposal,
  proposalId,
  sharePath,
  isKo,
}: Props) {
  const t = useTranslations("proposal");
  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const onPdf = async () => {
    if (!pdfRef.current) return;
    setPdfBusy(true);
    try {
      await downloadPdfFromHtmlElement(
        pdfRef.current,
        proposalPdfFilename(input.brandName),
      );
    } catch (e) {
      console.error(e);
      alert(t("pdfError"));
    } finally {
      setPdfBusy(false);
    }
  };

  const contactHref = proposalId
    ? `/contact?proposal=${encodeURIComponent(proposalId)}`
    : "/contact";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <BtnBlock
          variant="accent"
          size="md"
          className="!dark:text-white text-gray-900 bg-gradient-to-r from-violet-500 to-cyan-400"
          onClick={() => void onPdf()}
          disabled={pdfBusy}
        >
          <Download className="h-4 w-4" />
          {pdfBusy ? t("pdfGenerating") : t("downloadPdf")}
        </BtnBlock>
        {proposalId ? (
          <BtnBlock href={contactHref} variant="primary" size="md">
            <MessageCircle className="h-4 w-4" />
            {t("quoteWithProposal")}
          </BtnBlock>
        ) : null}
        {sharePath ? (
          <BtnBlock
            href={sharePath}
            variant="secondary"
            size="md"
            className="dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900"
          >
            <Share2 className="h-4 w-4" />
            {t("openSharePage")}
          </BtnBlock>
        ) : null}
      </div>

      <section className={glassCard}>
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-300">
          [ {t("sectionOverview")} ]
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed dark:text-white text-gray-800">
          {proposal.overview}
        </p>
      </section>

      <section className={glassCard}>
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.22em] text-violet-300">
          [ {t("sectionStrategy")} ]
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed dark:text-white text-gray-800">
          {proposal.strategy}
        </p>
      </section>

      <section className={glassCard}>
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.22em] text-pink-300">
          [ {t("sectionMediaMix")} ]
        </h2>
        <ul className="mt-4 space-y-4">
          {proposal.mediaMix.map((row) => (
            <li
              key={row.mediaId}
              className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold dark:text-white text-gray-900">{row.mediaName}</p>
                <span className="text-xs text-cyan-300">
                  {row.budgetSharePct}%
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold dark:text-white text-gray-500">{row.role}</p>
              <p className="mt-2 text-sm dark:text-white text-gray-700">{row.rationale}</p>
              <Link
                href={`/media/${encodeURIComponent(row.mediaId)}`}
                className="mt-2 inline-block text-xs font-semibold text-cyan-400 hover:underline"
              >
                {t("viewMedia")}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={cn(glassCard, "grid gap-4 sm:grid-cols-2")}>
        <div>
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
            [ {t("sectionBudget")} ]
          </h2>
          <ul className="mt-3 space-y-2 text-sm dark:text-white text-gray-800">
            {proposal.budgetAllocation.map((row, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-white/8 pb-2">
                <span>{row.label}</span>
                <span className="shrink-0 tabular-nums">
                  ₩{row.amountWon.toLocaleString(isKo ? "ko-KR" : "en-US")} (
                  {row.sharePct}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
            [ {t("sectionMetrics")} ]
          </h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="dark:text-white text-gray-500">{t("metricImpressions")}</dt>
              <dd className="font-bold tabular-nums dark:text-white text-gray-900">
                {proposal.metrics.estimatedImpressions.toLocaleString(
                  isKo ? "ko-KR" : "en-US",
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="dark:text-white text-gray-500">{t("metricReach")}</dt>
              <dd className="font-bold tabular-nums dark:text-white text-gray-900">
                {proposal.metrics.estimatedReach.toLocaleString(
                  isKo ? "ko-KR" : "en-US",
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="dark:text-white text-gray-500">CPM</dt>
              <dd className="font-bold tabular-nums dark:text-white text-gray-900">
                ₩
                {proposal.metrics.estimatedCpm.toLocaleString(
                  isKo ? "ko-KR" : "en-US",
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={glassCard}>
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.22em] dark:text-white text-gray-600">
          [ {t("sectionTimeline")} ]
        </h2>
        <ol className="mt-4 space-y-4">
          {proposal.timeline.map((item, i) => (
            <li key={i} className="border-l-2 border-violet-500/50 pl-4">
              <p className="font-bold dark:text-white text-gray-900">
                {item.phase}
                <span className="ml-2 text-xs font-normal dark:text-white text-gray-400">
                  {item.period}
                </span>
              </p>
              <ul className="mt-2 list-disc pl-4 text-sm dark:text-white text-gray-700">
                {item.tasks.map((task, j) => (
                  <li key={j}>{task}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className={glassCard}>
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">
          [ {t("sectionOutcomes")} ]
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm dark:text-white text-gray-800">
          {proposal.expectedOutcomes.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>

      <div className="pointer-events-none fixed -left-[9999px] top-0 w-[794px]">
        <div ref={pdfRef}>
          <ProposalPdfContent input={input} proposal={proposal} isKo={isKo} />
        </div>
      </div>
    </div>
  );
}
