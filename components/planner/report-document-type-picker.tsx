"use client";

import { cn } from "@/lib/utils";
import {
  PLANNER_DOCUMENT_TYPES,
  type PlannerDocumentTypeKey,
} from "@/lib/planner-report-export/document-type";

type Props = {
  isKo: boolean;
  value: PlannerDocumentTypeKey;
  onChange: (next: PlannerDocumentTypeKey) => void;
  className?: string;
};

export function ReportDocumentTypePicker({
  isKo,
  value,
  onChange,
  className,
}: Props) {
  return (
    <div
      className={cn("space-y-2", className)}
      data-screenshot="planner-report-document-type-picker"
    >
      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
        {isKo ? "문서 유형" : "Document type"}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLANNER_DOCUMENT_TYPES.map((dt) => {
          const selected = value === dt.key;
          return (
            <button
              key={dt.key}
              type="button"
              onClick={() => onChange(dt.key)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col rounded-xl border px-3 py-2.5 text-left transition-shadow",
                selected
                  ? "border-[color:var(--qp-accent)] ring-2 ring-[color:var(--qp-accent)]/30"
                  : "border-gray-200 hover:border-gray-300 dark:border-white/12",
              )}
            >
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {isKo ? dt.labelKo : dt.labelEn}
              </span>
              <span className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-white/50">
                {isKo ? dt.descKo : dt.descEn}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
