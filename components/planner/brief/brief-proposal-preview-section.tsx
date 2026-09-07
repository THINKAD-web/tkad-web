"use client";

import type { ReactNode } from "react";
import { FileDown, Loader2, Lock, Mail } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { Button } from "@/components/ui/button";
import { DocumentPreviewFrame } from "@/components/document/document-layout";
import { PlannerReportDocument } from "@/components/planner/report-document";
import { ReportStylePicker } from "@/components/planner/report-style-picker";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import { ReportCopyStaleBanner } from "@/components/planner/report-copy-stale-banner";
import { plannerProposalGateHint } from "@/lib/entitlements/tier-copy";
import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import type {
  PlannerReportExportFormat,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";

export function briefProposalPreviewVisible(
  payload: PlannerReportExportPayload | null | undefined,
): boolean {
  if (!payload) return false;
  if ((payload.onlineSection?.lines.length ?? 0) > 0) return true;
  return payload.portfolio.length > 0;
}

export type BriefProposalPreviewSectionProps = {
  isKo: boolean;
  variant: "ooh" | "online";
  exportPayload: PlannerReportExportPayload;
  reportStyle: PlannerReportStyle;
  onReportStyleChange: (style: PlannerReportStyle) => void;
  reportPreviewAllowed: boolean;
  reportPreviewLoading: boolean;
  mapPortfolio?: MediaItem[];
  onDocumentTitleChange?: (title: string) => void;
  onClientNameChange?: (name: string) => void;
  onGreetingChange?: (text: string) => void;
  onExecutiveSummaryChange?: (text: string) => void;
  copyStale?: boolean;
  onRegenerateCopy?: () => void;
  onKeepCopyEdits?: () => void;
  headerActions?: ReactNode;
  onExportPdf: () => void;
  onExportPptx?: () => void;
  onEmailClick?: () => void;
  exporting: PlannerReportExportFormat | null;
  exportError?: string | null;
};

export function BriefProposalPreviewSection({
  isKo,
  variant,
  exportPayload,
  reportStyle,
  onReportStyleChange,
  reportPreviewAllowed,
  reportPreviewLoading,
  mapPortfolio,
  onDocumentTitleChange,
  onClientNameChange,
  onGreetingChange,
  onExecutiveSummaryChange,
  copyStale = false,
  onRegenerateCopy,
  onKeepCopyEdits,
  headerActions,
  onExportPdf,
  onExportPptx,
  onEmailClick,
  exporting,
  exportError,
}: BriefProposalPreviewSectionProps) {
  const subtitle =
    variant === "online"
      ? isKo
        ? "문서 스타일을 선택하고 아래 내용이 PDF·PPTX와 동일하게 저장됩니다."
        : "Pick a document style — the preview matches PDF/PPTX export."
      : isKo
        ? "표지·인사말·요약을 편집한 뒤 PDF·이메일로 보낼 수 있습니다."
        : "Edit cover copy, then export or email the proposal.";

  return (
    <section className="space-y-4" data-testid="brief-proposal-preview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="tkad-type-title">
            {isKo ? "제안서 미리보기" : "Proposal preview"}
          </h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {headerActions ? (
          <div className="flex flex-wrap items-center gap-2">{headerActions}</div>
        ) : null}
      </div>

      {reportPreviewLoading ? (
        <p className="text-sm text-muted-foreground">
          {isKo ? "권한 확인 중…" : "Checking access…"}
        </p>
      ) : !reportPreviewAllowed ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {plannerProposalGateHint(isKo)}
        </div>
      ) : (
        <div className="space-y-4">
          {copyStale && onRegenerateCopy && onKeepCopyEdits ? (
            <ReportCopyStaleBanner
              isKo={isKo}
              onRegenerate={onRegenerateCopy}
              onKeep={onKeepCopyEdits}
            />
          ) : null}
          <ReportStylePicker
            isKo={isKo}
            value={reportStyle}
            onChange={onReportStyleChange}
          />
          <DocumentPreviewFrame>
            <PlannerReportDocument
              payload={exportPayload}
              mapPortfolio={mapPortfolio}
              reportStyle={reportStyle}
              editableTitle={Boolean(onDocumentTitleChange)}
              onDocumentTitleChange={onDocumentTitleChange}
              editableClientName={Boolean(onClientNameChange)}
              onClientNameChange={onClientNameChange}
              editableGreeting={Boolean(onGreetingChange)}
              onGreetingChange={onGreetingChange}
              editableExecutiveSummary={Boolean(onExecutiveSummaryChange)}
              onExecutiveSummaryChange={onExecutiveSummaryChange}
            />
          </DocumentPreviewFrame>

          <div className="flex flex-wrap gap-2">
            <PlannerPdfDownloadGate
              isKo={isKo}
              onAllowedDownload={onExportPdf}
            >
              {({ onDownloadClick, pdfAllowed, checking }) => (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={exporting !== null || checking}
                  onClick={onDownloadClick}
                >
                  {exporting === "pdf" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : !pdfAllowed ? (
                    <Lock className="mr-2 h-4 w-4" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  {!pdfAllowed
                    ? isKo
                      ? "제안서 PDF (PRO)"
                      : "Proposal PDF (PRO)"
                    : isKo
                      ? "제안서 PDF 생성"
                      : "Generate proposal PDF"}
                </Button>
              )}
            </PlannerPdfDownloadGate>

            {onExportPptx ? (
              <PlannerPdfDownloadGate
                isKo={isKo}
                onAllowedDownload={onExportPptx}
              >
                {({ onDownloadClick, pdfAllowed, checking }) => (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={exporting !== null || checking || !pdfAllowed}
                    onClick={onDownloadClick}
                  >
                    {exporting === "pptx" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : !pdfAllowed ? (
                      <Lock className="mr-2 h-4 w-4" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    {isKo ? "제안서 PPTX" : "Proposal PPTX"}
                  </Button>
                )}
              </PlannerPdfDownloadGate>
            ) : null}

            {variant === "ooh" && onEmailClick ? (
              <PlannerPdfDownloadGate
                isKo={isKo}
                onAllowedDownload={onEmailClick}
              >
                {({ onDownloadClick, pdfAllowed, checking }) => (
                  <Button
                    type="button"
                    variant="default"
                    disabled={checking}
                    onClick={onDownloadClick}
                  >
                    {!pdfAllowed ? (
                      <Lock className="mr-2 h-4 w-4" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {isKo ? "이메일로 보내기" : "Email proposal"}
                  </Button>
                )}
              </PlannerPdfDownloadGate>
            ) : null}
          </div>

          {exportError ? (
            <p className="text-xs text-destructive">{exportError}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
