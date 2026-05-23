import type { AccessCheckResult } from "@/lib/report-access-shared";
import type { MediaAnalyticsReport } from "@/lib/media-report-analytics";
import { ReportAccessGate } from "@/components/report-access-gate";

type Props = {
  report: MediaAnalyticsReport;
  isKo: boolean;
  access: AccessCheckResult;
};

export function CompetitorOohSection({ report, isKo, access }: Props) {
  const insights = report.competitorOoh ?? [];
  if (insights.length === 0) return null;

  const content = (
    <div className="space-y-3">
      {insights.map((row) => (
        <div
          key={row.industry}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-sm font-bold text-foreground">
            {isKo
              ? `이번 분기 ${row.industry} — ${row.periodLabelKo}`
              : `${row.industry} — last quarter`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isKo ? "많이 집행한 매체" : "Top booked media"}:{" "}
            {row.topMediaNames.join(", ") || "—"}
          </p>
          <p className="mt-1 text-xs text-primary">
            {isKo ? `${row.campaignCount}건 집행` : `${row.campaignCount} campaigns`}
          </p>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">
        {isKo
          ? "* THINKAD 자체 DB + 공개 집행 사례 기반 (추정 포함)"
          : "* Based on THINKAD DB and published cases"}
      </p>
    </div>
  );

  return (
    <section className="mt-10">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        [ {isKo ? "경쟁사 OOH 집행 분석" : "Competitor OOH booking trends"} ]
      </p>
      <h3 className="mt-2 text-lg font-bold">
        {isKo ? "업종별 최근 집행 매체" : "Recent media by industry"}
      </h3>
      <ReportAccessGate access={access} feature="competitor" isKo={isKo} className="mt-4">
        {content}
      </ReportAccessGate>
    </section>
  );
}

export function WeatherEventPanel({
  report,
  isKo,
}: {
  report: MediaAnalyticsReport;
  isKo: boolean;
}) {
  const sensitivity = report.weatherSensitivity;
  const insight = isKo ? report.weatherInsightKo : report.weatherInsightEn;
  const events = report.eventSynergies ?? [];

  if (!sensitivity && !insight && events.length === 0) return null;

  const sensLabel =
    sensitivity === "low"
      ? isKo
        ? "낮음"
        : "Low"
      : sensitivity === "high"
        ? isKo
          ? "높음"
          : "High"
        : isKo
          ? "보통"
          : "Medium";

  return (
    <section className="mt-10 rounded-xl border border-border bg-card/50 p-5">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
        [ {isKo ? "날씨·이벤트" : "Weather & events"} ]
      </p>
      {sensitivity ? (
        <p className="mt-3 text-sm font-semibold">
          {isKo ? "날씨 민감도" : "Weather sensitivity"}: {sensLabel}
          {report.weatherSensitivity === "low" && isKo ? " (실내 매체)" : ""}
        </p>
      ) : null}
      {insight ? (
        <p className="mt-2 text-sm text-muted-foreground">{insight}</p>
      ) : null}
      {events.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {events.map((e) => (
            <li key={e.labelKo} className="text-sm">
              <span className="font-medium text-foreground">
                {isKo ? "이벤트 시너지" : "Event synergy"}:
              </span>{" "}
              {isKo ? e.labelKo : e.labelEn}
              {e.boostPct > 0 ? (
                <span className="ml-1 font-semibold text-primary">
                  +{e.boostPct}%
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function DataMethodologyPanel({
  report,
  isKo,
}: {
  report: MediaAnalyticsReport;
  isKo: boolean;
}) {
  const lines = isKo ? report.methodologyKo : report.methodologyEn;
  if (!lines?.length) return null;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
        [ {isKo ? "데이터 출처 및 방법론" : "Data sources & methodology"} ]
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
