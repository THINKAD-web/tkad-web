"use client";

import { Download, FileText, Lock, Mail } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import { mediaProposalDownloadFilename } from "@/lib/media-proposal-filename";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";

type Props = {
  media: MediaItem;
  isKo: boolean;
  locale: string;
  className?: string;
};

export function MediaDetailProposalCard({
  media,
  isKo,
  locale,
  className,
}: Props) {
  const router = useRouter();
  const hasUploadedProposal =
    media.hasProposal === true || Boolean(media.proposalUrl?.trim());
  const downloadName = mediaProposalDownloadFilename(media, isKo);
  const proposalHref = `/api/media/${encodeURIComponent(media.id)}/proposal?locale=${encodeURIComponent(locale)}`;

  const triggerDownload = () => {
    const a = document.createElement("a");
    a.href = proposalHref;
    a.download = downloadName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className={
        className ??
        "rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <FileText className="h-5 w-5 text-violet-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {isKo ? "매체 제안서" : "Media proposal"}
              <span className="ml-1.5 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                PRO
              </span>
            </p>
            <p className="text-xs text-gray-400 dark:text-white/50">
              {hasUploadedProposal
                ? isKo
                  ? "PDF · 운영자 제공 제안서"
                  : "PDF · Official proposal"
                : isKo
                  ? "PDF · 매체 상세 정보 및 단가 포함"
                  : "PDF · Media specs & pricing"}
            </p>
          </div>
        </div>

        {hasUploadedProposal ? (
          <PlannerPdfDownloadGate isKo={isKo} onAllowedDownload={triggerDownload}>
            {({ onDownloadClick, pdfAllowed, checking }) => (
              <button
                type="button"
                onClick={onDownloadClick}
                disabled={checking}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-60"
              >
                {!pdfAllowed ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {!pdfAllowed
                  ? isKo
                    ? "PRO 제안서"
                    : "PRO proposal"
                  : isKo
                    ? "다운로드"
                    : "Download"}
              </button>
            )}
          </PlannerPdfDownloadGate>
        ) : (
          <button
            type="button"
            onClick={() =>
              router.push(
                `/contact?media=${encodeURIComponent(media.id)}&type=proposal`,
              )
            }
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-600"
          >
            <Mail className="h-4 w-4" />
            {isKo ? "제안서 요청" : "Request"}
          </button>
        )}
      </div>

      {!hasUploadedProposal ? (
        <p className="mt-3 text-center text-[11px] text-gray-500 dark:text-white/45">
          {isKo ? "또는 " : "Or "}
          <PlannerPdfDownloadGate isKo={isKo} onAllowedDownload={triggerDownload}>
            {({ onDownloadClick, pdfAllowed }) => (
              <button
                type="button"
                onClick={onDownloadClick}
                className="font-medium text-violet-600 underline underline-offset-2 dark:text-violet-300"
              >
                {!pdfAllowed
                  ? isKo
                    ? "🔒 기본 제안서 (PRO)"
                    : "🔒 Basic proposal (PRO)"
                  : isKo
                    ? "기본 제안서 바로 받기"
                    : "download the basic PDF"}
              </button>
            )}
          </PlannerPdfDownloadGate>
        </p>
      ) : null}
    </div>
  );
}
