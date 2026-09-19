"use client";

import type { MediaItem } from "@/lib/media-data";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import type { PlannerDocumentTypeKey } from "@/lib/planner-report-export/document-type";
import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import type { PlannerReportSectionVisibility } from "@/lib/planner-report-export/section-visibility";
import { ReportDocumentTypePicker } from "@/components/planner/report-document-type-picker";
import { ReportStylePicker } from "@/components/planner/report-style-picker";
import { ReportSectionVisibilityPanel } from "@/components/planner/report-section-visibility-panel";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  exportPayload: PlannerReportExportPayload;
  mapPortfolio?: readonly MediaItem[];
  documentType: PlannerDocumentTypeKey;
  onDocumentTypeChange: (next: PlannerDocumentTypeKey) => void;
  reportStyle: PlannerReportStyle;
  onReportStyleChange: (style: PlannerReportStyle) => void;
  sectionVisibility: Record<
    import("@/lib/planner-report-export/section-visibility").PlannerReportSectionKey,
    boolean
  >;
  onSectionVisibilityChange: (
    next: Record<
      import("@/lib/planner-report-export/section-visibility").PlannerReportSectionKey,
      boolean
    >,
  ) => void;
  className?: string;
  id?: string;
};

/** 문서유형 · 디자인 스타일 · 다운로드 섹션 — 모든 플래너 리포트 진입점 공통 */
export function ReportExportSettingsPanel({
  isKo,
  exportPayload,
  mapPortfolio,
  documentType,
  onDocumentTypeChange,
  reportStyle,
  onReportStyleChange,
  sectionVisibility,
  onSectionVisibilityChange,
  className,
  id = "planner-report-settings",
}: Props) {
  return (
    <div
      id={id}
      className={cn(
        "flex scroll-mt-4 flex-col gap-4 border-b border-gray-100 p-5 dark:border-white/10 sm:p-6",
        className,
      )}
      data-screenshot="planner-report-export-settings"
    >
      <ReportDocumentTypePicker
        isKo={isKo}
        value={documentType}
        onChange={onDocumentTypeChange}
      />
      <ReportStylePicker
        isKo={isKo}
        value={reportStyle}
        onChange={onReportStyleChange}
      />
      <ReportSectionVisibilityPanel
        isKo={isKo}
        payload={exportPayload}
        mapPortfolio={mapPortfolio}
        visibility={sectionVisibility}
        onChange={onSectionVisibilityChange}
      />
    </div>
  );
}

export type { PlannerReportSectionVisibility };
