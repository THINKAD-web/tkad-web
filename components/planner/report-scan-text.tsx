"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

/** 보고서 전략·효과 문장 안 숫자·비율·통화를 스캔하기 쉽게 강조 */
const HIGHLIGHT_RE =
  /(\d[\d,]*(?:\.\d+)?(?:만원|배|회|명|%|×|x)?|₩[\d,]+)/gi;

function isHighlightToken(part: string): boolean {
  return /^\d[\d,]*(?:\.\d+)?(?:만원|배|회|명|%|×|x)?$/i.test(part) || /^₩[\d,]+$/.test(part);
}

export function highlightReportScanText(text: string): React.ReactNode[] {
  const parts = text.split(HIGHLIGHT_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    if (isHighlightToken(part)) {
      return (
        <strong
          key={`${i}-${part}`}
          className="font-bold tabular-nums text-[color:var(--qp-accent)]"
        >
          {part}
        </strong>
      );
    }
    return <Fragment key={`${i}-${part}`}>{part}</Fragment>;
  });
}

type ReportScanLineProps = {
  text: string;
  className?: string;
};

/** "라벨 · 본문" 형태 전략 문장 — 라벨 칩 + 강조 본문 */
export function ReportScanLine({ text, className }: ReportScanLineProps) {
  const dot = text.indexOf(" · ");
  if (dot > 0 && dot < 40) {
    const label = text.slice(0, dot);
    const body = text.slice(dot + 3);
    return (
      <li className={cn("space-y-1.5", className)}>
        <span className="inline-block rounded-md bg-[color:var(--qp-accent)]/10 px-2 py-0.5 tkad-type-caption font-bold uppercase tracking-wide text-[color:var(--qp-accent)]">
          {label}
        </span>
        <p className="text-sm leading-relaxed text-gray-700">
          {highlightReportScanText(body)}
        </p>
      </li>
    );
  }

  return (
    <li className={cn("flex gap-2.5 text-sm leading-relaxed text-gray-700", className)}>
      <span
        className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--qp-accent)]"
        aria-hidden
      />
      <span className="min-w-0 break-words">{highlightReportScanText(text)}</span>
    </li>
  );
}
