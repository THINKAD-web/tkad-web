"use client";

import { useCallback, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import {
  computePlannerReportSectionAvailability,
  defaultPlannerReportSectionVisibility,
  type PlannerReportSectionKey,
  type PlannerReportSectionVisibility,
  writePlannerReportSectionVisibility,
} from "@/lib/planner-report-export/section-visibility";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<
  PlannerReportSectionKey,
  { ko: string; en: string }
> = {
  map: { ko: "지도", en: "Map" },
  recommend: { ko: "추천 근거", en: "Recommendation rationale" },
  subdivision: { ko: "상권·권역 세분화", en: "District & zone detail" },
  region: { ko: "지역별 예산·효과", en: "Budget by region" },
  performance: { ko: "성과 요약", en: "Performance summary" },
  extraSections: { ko: "추가 서술", en: "Extra narrative sections" },
};

type Props = {
  isKo: boolean;
  payload: PlannerReportExportPayload;
  mapPortfolio?: readonly MediaItem[];
  visibility: Record<PlannerReportSectionKey, boolean>;
  onChange: (next: Record<PlannerReportSectionKey, boolean>) => void;
  className?: string;
};

export function ReportSectionVisibilityPanel({
  isKo,
  payload,
  mapPortfolio,
  visibility,
  onChange,
  className,
}: Props) {
  const availability = useMemo(
    () =>
      computePlannerReportSectionAvailability({
        payload,
        mapPortfolio,
        isKo,
      }),
    [payload, mapPortfolio, isKo],
  );

  const setKey = useCallback(
    (key: PlannerReportSectionKey, checked: boolean) => {
      const next = { ...visibility, [key]: checked };
      onChange(next);
      writePlannerReportSectionVisibility(next);
    },
    [visibility, onChange],
  );

  return (
    <details
      className={cn(
        "rounded-xl border border-gray-200 bg-white/80 dark:border-white/12 dark:bg-white/5",
        className,
      )}
      data-screenshot="planner-report-section-visibility"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/90 [&::-webkit-details-marker]:hidden">
        <span>
          {isKo ? "다운로드에 포함할 섹션" : "Sections to include in export"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      </summary>
      <div className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-white/10">
        <p className="text-[11px] leading-snug text-gray-500 dark:text-white/50">
          {isKo
            ? "미리보기와 PDF·PPT에 동일하게 반영됩니다. 개요·KPI·매체 구성·면책은 항상 포함됩니다."
            : "Applies to preview and PDF/PPT. Overview, KPIs, media lineup, and disclaimer are always included."}
        </p>
        <ul className="space-y-2">
          {(Object.keys(SECTION_LABELS) as PlannerReportSectionKey[]).map(
            (key) => {
              const meta = availability[key];
              const label = isKo ? SECTION_LABELS[key].ko : SECTION_LABELS[key].en;
              const disabled = !meta.available;
              const reason = isKo ? meta.reasonKo : meta.reasonEn;
              return (
                <li key={key} className="flex items-start gap-2">
                  <input
                    id={`report-section-${key}`}
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[color:var(--qp-accent)] focus:ring-[color:var(--qp-accent-ring)] disabled:opacity-40"
                    checked={visibility[key]}
                    disabled={disabled}
                    onChange={(e) => setKey(key, e.target.checked)}
                  />
                  <label
                    htmlFor={`report-section-${key}`}
                    className={cn(
                      "min-w-0 flex-1 text-sm",
                      disabled
                        ? "text-gray-400 dark:text-white/35"
                        : "text-gray-800 dark:text-white/85",
                    )}
                  >
                    <span className="font-medium">{label}</span>
                    {disabled && reason ? (
                      <span className="ml-1.5 text-[11px] text-gray-400">
                        ({reason})
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            },
          )}
        </ul>
        <button
          type="button"
          className="text-xs font-medium text-[color:var(--qp-accent)] hover:text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]"
          onClick={() => {
            const next = defaultPlannerReportSectionVisibility();
            onChange(next);
            writePlannerReportSectionVisibility(next);
          }}
        >
          {isKo ? "모두 선택" : "Select all"}
        </button>
      </div>
    </details>
  );
}

export type { PlannerReportSectionVisibility };
