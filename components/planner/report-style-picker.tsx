"use client";

import { cn } from "@/lib/utils";
import {
  getReportDocumentTheme,
  REPORT_STYLE_LABELS,
  PLANNER_REPORT_STYLES,
  type PlannerReportStyle,
} from "@/lib/planner-report-export/document-theme";

type Props = {
  isKo: boolean;
  value: PlannerReportStyle;
  onChange: (next: PlannerReportStyle) => void;
  className?: string;
};

export function ReportStylePicker({ isKo, value, onChange, className }: Props) {
  return (
    <div
      className={cn("space-y-2", className)}
      data-screenshot="planner-report-style-picker"
    >
      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
        {isKo ? "제안서 스타일" : "Proposal style"}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {PLANNER_REPORT_STYLES.map((style) => {
          const theme = getReportDocumentTheme(style);
          const labels = REPORT_STYLE_LABELS[style];
          const selected = value === style;
          return (
            <button
              key={style}
              type="button"
              onClick={() => onChange(style)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border text-left transition-shadow",
                selected
                  ? "border-[color:var(--style-accent)] ring-2 ring-[color:var(--style-accent)]/30"
                  : "border-gray-200 hover:border-gray-300 dark:border-white/12",
              )}
              style={
                {
                  "--style-accent": theme.accent,
                } as React.CSSProperties
              }
            >
              <div
                className="h-14 px-3 py-2"
                style={{ background: theme.coverBg, color: theme.coverText }}
              >
                <span
                  className="block h-0.5 w-8 rounded-full"
                  style={{ background: theme.accent }}
                  aria-hidden
                />
                <span className="mt-2 block text-[10px] font-semibold uppercase tracking-widest opacity-70">
                  THINKAD
                </span>
              </div>
              <div className="space-y-0.5 bg-white px-3 py-2.5 dark:bg-white/[0.04]">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isKo ? labels.ko : labels.en}
                </span>
                <span className="block text-[11px] leading-snug text-gray-500 dark:text-white/50">
                  {isKo ? labels.descKo : labels.descEn}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
