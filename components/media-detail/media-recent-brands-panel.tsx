"use client";

import { Users } from "lucide-react";
import { ReportAccessGate } from "@/components/report-access-gate";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import type { MediaRecentBrandsData } from "@/lib/insights/media-recent-brands";

type Props = {
  data: MediaRecentBrandsData;
  isKo: boolean;
  access: AccessCheckResult;
};

export function MediaRecentBrandsPanel({ data, isKo, access }: Props) {
  if (data.brands.length === 0 && !data.regionNoteKo && !data.regionNoteEn) {
    return null;
  }

  const content = (
    <div className="rounded-2xl border border-[color:var(--qp-accent)]/20 bg-[color:var(--qp-accent)]/5 p-5">
      <h3 className="flex items-center gap-2 text-[length:var(--qp-text-h3)] font-bold tracking-tight dark:text-white text-gray-900">
        <Users className="h-4 w-4 text-[color:var(--qp-accent)]" />
        {isKo ? "이 매체 최근 집행 브랜드" : "Recent brands on this media"}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {isKo
          ? "브랜드명은 익명 처리됩니다. 업종·집행 기간만 표시."
          : "Brand names are anonymized. Industry and period only."}
      </p>

      {data.brands.length > 0 ? (
        <ul className="mt-4 divide-y dark:divide-white/8 divide-gray-100">
          {data.brands.map((b, i) => (
            <li
              key={`${b.anonymizedName}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
            >
              <span className="font-semibold dark:text-white text-gray-900">
                {b.anonymizedName}
              </span>
              <span className="text-xs text-muted-foreground">
                {b.industryLabel}
                {" · "}
                {isKo ? b.periodLabelKo : b.periodLabelEn}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {isKo
            ? "최근 집행 이력이 아직 등록되지 않았습니다."
            : "No recent flight records yet."}
        </p>
      )}

      {(isKo ? data.regionNoteKo : data.regionNoteEn) ? (
        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
          {isKo ? data.regionNoteKo : data.regionNoteEn}
        </p>
      ) : null}
    </div>
  );

  return (
    <ReportAccessGate access={access} feature="competitor" isKo={isKo}>
      {content}
    </ReportAccessGate>
  );
}

/** FREE — 블러 미리보기 */
export function MediaRecentBrandsTeaser({
  data,
  isKo,
}: {
  data: MediaRecentBrandsData;
  isKo: boolean;
}) {
  if (data.brands.length === 0 && !data.regionNoteKo && !data.regionNoteEn) {
    return null;
  }

  return (
    <div className="pointer-events-none select-none blur-sm">
      <MediaRecentBrandsPanel
        data={data}
        isKo={isKo}
        access={{ allowed: true, level: "PRO", reason: undefined }}
      />
    </div>
  );
}
