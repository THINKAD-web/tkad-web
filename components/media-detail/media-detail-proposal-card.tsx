"use client";

import { Download, FileText, Loader2, Lock } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { trackEvent } from "@/lib/ga-events";
import { mediaProposalDownloadFilename } from "@/lib/media-proposal-filename";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import { cn } from "@/lib/utils";

type Props = {
  media: MediaItem;
  isKo: boolean;
  locale: string;
  className?: string;
  /** 사이드바 — 단일 버튼 행 */
  variant?: "card" | "inline";
  /** 사이드바 2차 CTA — 아이콘+짧은 라벨 */
  compactSecondary?: boolean;
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
  variant = "card",
  compactSecondary = false,
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

  if (variant === "inline") {
    return (
      <PlannerPdfDownloadGate isKo={isKo} onAllowedDownload={triggerDownload}>
        {({ onDownloadClick, pdfAllowed, checking }) => (
          <button
            type="button"
            onClick={onDownloadClick}
            disabled={checking}
            className={cn(
              compactSecondary
                ? "inline-flex h-8 w-full min-w-0 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 text-[10px] font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/6 dark:text-white/80 dark:hover:bg-white/10"
                : "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-gray-800 transition hover:bg-gray-100 disabled:opacity-60 dark:border-white/12 dark:bg-white/8 dark:text-white/90 dark:hover:bg-white/12",
              className,
            )}
          >
            {checking ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : pdfAllowed ? (
              <Download className="h-3 w-3 shrink-0" aria-hidden />
            ) : (
              <Lock className="h-3 w-3 shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {compactSecondary
                ? isKo
                  ? "PRO"
                  : "PRO"
                : pdfAllowed
                  ? isKo
                    ? "제안서 다운로드"
                    : "Download proposal"
                  : isKo
                    ? "PRO 제안서"
                    : "PRO proposal"}
            </span>
            {!compactSecondary ? (
              <span className="rounded bg-[color:var(--qp-accent)]/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
                PRO
              </span>
            ) : null}
          </button>
        )}
      </PlannerPdfDownloadGate>
    );
  }

  return (
    <div
      className={
        className ??
        "rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5"
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--qp-accent)]/10">
          <FileText className="h-5 w-5 text-[color:var(--qp-accent)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
            {isKo ? "매체 제안서" : "Media proposal"}
            <span className="rounded-md bg-[color:var(--qp-accent)]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
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
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--qp-accent)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[color:var(--qp-accent-hover)] disabled:opacity-60"
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
