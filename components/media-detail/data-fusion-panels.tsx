import { normalizeMediaDetailTextLocale } from "@/lib/media-i18n";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import type { MediaAnalyticsReport } from "@/lib/media-report-analytics";
import { ReportAccessGate } from "@/components/report-access-gate";

type Props = {
  report: MediaAnalyticsReport;
  locale: string;
  access: AccessCheckResult;
};

export function CompetitorOohSection({ report, locale, access }: Props) {
  const bucket = normalizeMediaDetailTextLocale(locale);
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
            {(bucket === "ko")
              ? `이번 분기 ${row.industry} — ${row.periodLabelKo}`
              : `${row.industry} — last quarter`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(bucket === "ko") ? "많이 집행한 매체" : "Top booked media"}:{" "}
            {row.topMediaNames.join(", ") || "—"}
          </p>
          <p className="mt-1 text-xs text-primary">
            {(bucket === "ko") ? `${row.campaignCount}건 집행` : `${row.campaignCount} campaigns`}
          </p>
        </div>
      ))}
      <p className="tkad-type-note text-muted-foreground">
        {(bucket === "ko")
          ? "* THINKAD 자체 DB + 공개 집행 사례 기반 (추정 포함)"
          : "* Based on THINKAD DB and published cases"}
      </p>
    </div>
  );

  return (
    <section className="mt-10">
      <p className="tkad-type-label text-muted-foreground">
        [ {(bucket === "ko") ? "경쟁사 OOH 집행 분석" : "Competitor OOH booking trends"} ]
      </p>
      <h3 className="mt-2 text-[length:var(--qp-text-h3)] font-bold tracking-tight">
        {(bucket === "ko") ? "업종별 최근 집행 매체" : "Recent media by industry"}
      </h3>
      <ReportAccessGate access={access} feature="competitor" locale={locale} className="mt-4">
        {content}
      </ReportAccessGate>
    </section>
  );
}

export function WeatherEventPanel({
  report,
  locale,
}: {
  report: MediaAnalyticsReport;
  locale: string;
}) {
  const bucket = normalizeMediaDetailTextLocale(locale);
  const sensitivity = report.weatherSensitivity;
  const insight = (bucket === "ko") ? report.weatherInsightKo : report.weatherInsightEn;
  const events = report.eventSynergies ?? [];

  if (!sensitivity && !insight && events.length === 0) return null;

  const sensLabel =
    sensitivity === "low"
      ? (bucket === "ko")
        ? "낮음"
        : "Low"
      : sensitivity === "high"
        ? (bucket === "ko")
          ? "높음"
          : "High"
        : (bucket === "ko")
          ? "보통"
          : "Medium";

  return (
    <section className="mt-10 rounded-xl border border-border bg-card/50 p-5">
      <p className="tkad-type-label text-primary">
        [ {(bucket === "ko") ? "날씨·이벤트" : "Weather & events"} ]
      </p>
      {sensitivity ? (
        <p className="mt-3 text-sm font-semibold">
          {(bucket === "ko") ? "날씨 민감도" : "Weather sensitivity"}: {sensLabel}
          {report.weatherSensitivity === "low" && (bucket === "ko") ? " (실내 매체)" : ""}
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
                {(bucket === "ko") ? "이벤트 시너지" : "Event synergy"}:
              </span>{" "}
              {(bucket === "ko") ? e.labelKo : e.labelEn}
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
  locale,
}: {
  report: MediaAnalyticsReport;
  locale: string;
}) {
  const bucket = normalizeMediaDetailTextLocale(locale);
  const lines = (bucket === "ko") ? report.methodologyKo : report.methodologyEn;
  if (!lines?.length) return null;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <p className="tkad-type-label text-muted-foreground">
        [ {(bucket === "ko") ? "데이터 출처 및 방법론" : "Data sources & methodology"} ]
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
