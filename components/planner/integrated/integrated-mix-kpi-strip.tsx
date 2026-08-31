"use client";

import { Eye } from "lucide-react";
import type { IntegratedMixKpiView } from "@/lib/integrated/map-mix-to-ui";
import { cn } from "@/lib/utils";

type Props = {
  kpis: IntegratedMixKpiView;
  isKo: boolean;
  className?: string;
};

function formatRange(
  min: number | null,
  max: number | null,
  locale: string,
): string {
  if (min == null && max == null) return "—";
  const lo = min ?? max!;
  const hi = max ?? min!;
  if (lo === hi) return lo.toLocaleString(locale);
  return `${lo.toLocaleString(locale)}–${hi.toLocaleString(locale)}`;
}

export function IntegratedMixKpiStrip({ kpis, isKo, className }: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const labels = isKo
    ? {
        ooh: "집행 기간 총 노출 (추정)",
        digital: "월간 노출 (추정)",
        combined: "통합 총 노출 (추정, 시너지 포함)",
        section: "노출 KPI (단위 구분)",
      }
    : {
        ooh: "Campaign-period total impressions (est.)",
        digital: "Monthly impressions (est.)",
        combined: "Combined total impressions (est., incl. synergy)",
        section: "Impression KPIs (units separated)",
      };

  return (
    <section
      data-testid="integrated-mix-kpi-strip"
      aria-label={labels.section}
      className={cn(
        "grid gap-3 rounded-2xl border border-[color:var(--qp-line)] bg-[color:var(--qp-accent-soft)]/40 p-4 sm:grid-cols-3 sm:p-5",
        className,
      )}
    >
      <KpiTile
        label={labels.ooh}
        value={kpis.oohCampaignImpressions.toLocaleString(locale)}
        testId="kpi-ooh-campaign-impressions"
      />
      <KpiTile
        label={labels.digital}
        value={formatRange(
          kpis.digitalMonthlyImpressionsMin,
          kpis.digitalMonthlyImpressionsMax,
          locale,
        )}
        testId="kpi-digital-monthly-impressions"
      />
      <KpiTile
        label={labels.combined}
        value={formatRange(
          kpis.combinedImpressionsMin,
          kpis.combinedImpressionsMax,
          locale,
        )}
        testId="kpi-combined-impressions"
        highlight
      />
    </section>
  );
}

function KpiTile({
  label,
  value,
  testId,
  highlight,
}: {
  label: string;
  value: string;
  testId: string;
  highlight?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-xl border bg-white p-4 dark:bg-white/5",
        highlight
          ? "border-emerald-400/40 dark:border-emerald-500/30"
          : "border-gray-200 dark:border-white/10",
      )}
    >
      <Eye
        className={cn(
          "h-4 w-4",
          highlight ? "text-emerald-500" : "text-[color:var(--qp-accent)]",
        )}
        aria-hidden
      />
      <p className="mt-2 tkad-type-caption font-semibold leading-snug text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tabular-nums text-foreground dark:text-white">
        {value}
      </p>
    </div>
  );
}
