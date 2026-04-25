"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Target, Wallet, CalendarRange, MapPin, Layers, Users, Briefcase } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl, resolveMediaGallery } from "@/lib/media-data";
import type { PlannerMetrics } from "@/lib/planner-logic";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import { DEFAULT_LOGO_PLACEMENT } from "@/components/planner/composite-preview";

export type PlannerReportPreviewBudgetSlice = {
  label: string;
  pct: number;
  valueMan: number;
};

type Props = {
  isKo: boolean;
  goalTitle: string;
  budgetNum: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  portfolio: MediaItem[];
  metrics: PlannerMetrics | null;
  reachCorePct: number;
  reachExtendedPct: number;
  budgetAllocation: PlannerReportPreviewBudgetSlice[];
  blendedCpmKrw: number | null;
  effectSummaryLines: string[];
  generatedAt: string;
  /** PR-9: PDF에 합성 로고 이미지 포함 */
  logoUrl?: string | null;
  mediaPlacements?: Record<string, CompositeLogoPlacement>;
};

function thumbUrl(m: MediaItem): string | null {
  return getPrimaryMediaImageUrl(m) ?? resolveMediaGallery(m)[0] ?? null;
}

const PlannerReportPreview = forwardRef<HTMLDivElement, Props>(
  function PlannerReportPreview(
    {
  isKo,
  goalTitle,
  budgetNum,
  periodDisplay,
  regionsText,
  categoriesText,
  ageText,
  industryText,
  portfolio,
  metrics,
  reachCorePct,
  reachExtendedPct,
  budgetAllocation,
  blendedCpmKrw,
  effectSummaryLines,
  generatedAt,
  logoUrl,
  mediaPlacements,
}: Props,
  ref,
) {
  const tm = useTranslations("media");
  const t = useTranslations("planner");

  const typeLabel = (m: MediaItem) => {
    const ty = m.type;
    if (
      ty === "digital" ||
      ty === "static" ||
      ty === "mobile" ||
      ty === "network"
    ) {
      return tm(`types.${ty}`);
    }
    return ty;
  };

  return (
    <div
      ref={ref}
      id="planner-report-content"
      className="box-border w-full max-w-[210mm] space-y-8 bg-white text-slate-900 antialiased"
    >
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-gradient-to-br from-navy via-navy to-[#152a5c] p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-gold/90">
          THINKAD Planner
        </p>
        <h3 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">
          {t("reportPdfTitle")}
        </h3>
        <p className="mt-2 text-sm text-white/70">{generatedAt}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <Target className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("reportLabelGoal")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{goalTitle}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <Wallet className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("reportLabelBudget")}
            </dt>
            <dd className="mt-1 text-sm font-bold tabular-nums">
              {budgetNum.toLocaleString()}
              {isKo ? "만원 (총)" : " ₩10K (total)"}
            </dd>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <CalendarRange className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("reportLabelPeriod")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{periodDisplay}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <MapPin className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("reportLabelRegions")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{regionsText}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <Layers className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("reportLabelCategories")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{categoriesText}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <dt className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <Users className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("reportLabelAge")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{ageText}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm sm:col-span-2 lg:col-span-3">
            <dt className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <Briefcase className="h-3.5 w-3.5 text-gold" aria-hidden />
              {t("reportLabelIndustry")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{industryText}</dd>
          </div>
        </dl>
      </div>

      <section>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">
          {t("reportSectionMedia")}
        </h4>
        {portfolio.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy/15 bg-slate-50 px-4 py-8 text-center text-sm text-muted-foreground">
            {t("reportPreviewNoMedia")}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((m) => {
              const src = thumbUrl(m);
              const name = isKo ? m.name : (m.nameEn || m.name) || m.name;
              const loc = isKo ? m.location : (m.locationEn || m.location) || m.location;
              return (
                <li
                  key={m.id}
                  className="flex gap-3 rounded-xl border border-navy/10 bg-white p-3 shadow-sm"
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 외부·Cloudinary URL 등 임의 도메인
                      <img
                        src={src}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        {t("reportPreviewNoImage")}
                      </div>
                    )}
                    {logoUrl && src ? (() => {
                      const p =
                        mediaPlacements?.[m.id] ?? DEFAULT_LOGO_PLACEMENT;
                      return (
                        <div
                          className="pointer-events-none absolute flex items-start justify-center"
                          style={{
                            left: `${p.xPct}%`,
                            top: `${p.yPct}%`,
                            width: `${p.widthPct}%`,
                            transform: `translate(-50%, -50%) rotate(${p.rotationDeg ?? 0}deg)`,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoUrl}
                            alt=""
                            className="w-full object-contain"
                          />
                        </div>
                      );
                    })() : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold text-navy">{name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                      {loc}
                    </p>
                    <p className="mt-1 text-xs text-navy/60">{typeLabel(m)}</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-gold-dark">
                      ₩{m.price.toLocaleString()}
                      <span className="text-[11px] font-medium text-navy/55">
                        {isKo ? "만/월" : " ₩10K/mo"}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {metrics ? (
        <section>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">
            {t("reportSectionEffect")}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                {t("reportLabelMonthlyImp")}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
                {metrics.estimatedMonthlyImpressions.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                {t("reportLabelTotalImp")}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
                {metrics.estimatedTotalImpressions.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                {t("reportLabelReachCore")}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-gold-dark">
                {reachCorePct}%
              </p>
            </div>
            <div className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">
                {t("reportLabelReachExtended")}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-gold-dark">
                {reachExtendedPct}%
              </p>
            </div>
            {blendedCpmKrw != null ? (
              <div className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("reportLabelCpm")}
                </p>
                <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
                  ₩{blendedCpmKrw.toLocaleString()}
                </p>
              </div>
            ) : null}
            <div className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("reportLabelRoiExpected")}
              </p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
                {metrics.roiExpected}
                {t("roiUnit")}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy">
          {t("reportSectionBudgetAllocation")}
        </h4>
        <p className="mb-4 text-xs text-muted-foreground">{t("reportBudgetAllocationIntro")}</p>
        {budgetAllocation.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <ul className="space-y-4">
            {budgetAllocation.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-navy">{row.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.pct}% · {row.valueMan.toLocaleString()}
                    {isKo ? "만/월" : " ₩10K/mo"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-navy to-gold"
                    style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-gold/25 bg-gold/5 p-5 sm:p-6">
        <h4 className="text-sm font-bold text-navy">{t("reportSectionEffectSummary")}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{t("reportEffectSummaryIntro")}</p>
        <ul className="mt-4 space-y-2 text-sm text-navy">
          {effectSummaryLines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-gold">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
},
);

export default PlannerReportPreview;
