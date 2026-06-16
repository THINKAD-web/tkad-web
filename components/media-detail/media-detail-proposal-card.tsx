"use client";

import { Download, FileText, Loader2, Lock } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { trackEvent } from "@/lib/ga-events";
import { mediaProposalDownloadFilename } from "@/lib/media-proposal-filename";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";

type Props = {
  media: MediaItem;
  isKo: boolean;
  locale: string;
  className?: string;
};

/**
 * 매체 제안서 다운로드 카드 — 항상 고급 자동 생성 PDF.
 * 단일 다운로드 버튼만 노출(업로드본·요청 분기 제거). PRO 게이팅 유지.
 */
export function MediaDetailProposalCard({
  media,
  isKo,
  locale,
  className,
}: Props) {
  const downloadName = mediaProposalDownloadFilename(media, isKo);
  const proposalHref = `/api/media/${encodeURIComponent(media.id)}/proposal?locale=${encodeURIComponent(locale)}`;

  const triggerDownload = () => {
    trackEvent("download_proposal", { media_id: media.id, media_name: media.name });
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
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
          <FileText className="h-5 w-5 text-violet-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
            {isKo ? "매체 제안서" : "Media proposal"}
            <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
              PRO
            </span>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400 dark:text-white/50">
            {isKo ? "PDF · 이미지 형식" : "PDF · image format"}
          </p>
        </div>
      </div>

      <PlannerPdfDownloadGate isKo={isKo} onAllowedDownload={triggerDownload}>
        {({ onDownloadClick, pdfAllowed, checking }) => (
          <button
            type="button"
            onClick={onDownloadClick}
            disabled={checking}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : pdfAllowed ? (
              <Download className="h-4 w-4" aria-hidden />
            ) : (
              <Lock className="h-4 w-4" aria-hidden />
            )}
            {pdfAllowed
              ? isKo
                ? "제안서 다운로드"
                : "Download"
              : isKo
                ? "PRO 제안서"
                : "PRO proposal"}
          </button>
        )}
      </PlannerPdfDownloadGate>
    </div>
  );
}
