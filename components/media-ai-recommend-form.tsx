"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  CalendarDays,
  MapPin,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  AiRecommendInput,
  Industry,
  TargetAudience,
} from "@/lib/ai-media-recommend";

export type RegionCheckboxCode =
  | "seoul"
  | "capital"
  | "busan"
  | "jeju"
  | "national";

type AgeBand = "teens" | "twenties" | "thirties" | "forties";
type PeriodWeeks = 1 | 2 | 4 | 12;

function mapAgeBands(bands: ReadonlySet<AgeBand>): TargetAudience {
  if (bands.size === 0) return "mass";
  if (
    bands.has("forties") &&
    !bands.has("twenties") &&
    !bands.has("thirties") &&
    !bands.has("teens")
  ) {
    return "family";
  }
  if (bands.has("teens") && bands.size === 1) return "genz";
  if (bands.has("twenties") || bands.has("thirties")) return "millennial";
  if (bands.has("teens")) return "genz";
  if (bands.has("forties")) return "family";
  return "mass";
}

export type MediaAiRecommendFormSubmit = {
  input: AiRecommendInput;
  /** 선택 지역(빈 배열이면 전국·필터 없음) */
  regionCodes: RegionCheckboxCode[];
};

type Props = {
  locale: string;
  onSubmit: (payload: MediaAiRecommendFormSubmit) => void;
};

export default function MediaAiRecommendForm({ locale, onSubmit }: Props) {
  const tr = useTranslations("recommend");
  const isKo = locale === "ko";

  const [regions, setRegions] = useState<Set<RegionCheckboxCode>>(
    () => new Set(["seoul"]),
  );
  const [ageBands, setAgeBands] = useState<Set<AgeBand>>(
    () => new Set(["twenties", "thirties"]),
  );
  const [budgetMan, setBudgetMan] = useState(2500);
  const [industry, setIndustry] = useState<Industry>("beauty");
  const [periodWeeks, setPeriodWeeks] = useState<PeriodWeeks>(2);

  const budgetMin = 500;
  const budgetMax = 5000;

  const toggleRegion = useCallback((code: RegionCheckboxCode) => {
    setRegions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const toggleAge = useCallback((b: AgeBand) => {
    setAgeBands((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }, []);

  const regionDef = useMemo(
    () =>
      [
        { code: "seoul" as const, label: tr("form.regionSeoul") },
        { code: "capital" as const, label: tr("form.regionGyeonggi") },
        { code: "busan" as const, label: tr("form.regionBusan") },
        { code: "jeju" as const, label: tr("form.regionJeju") },
        { code: "national" as const, label: tr("form.regionNational") },
      ] as const,
    [tr],
  );

  const ageDef = useMemo(
    () =>
      [
        { code: "teens" as const, label: tr("form.ageTeens") },
        { code: "twenties" as const, label: tr("form.ageTwenties") },
        { code: "thirties" as const, label: tr("form.ageThirties") },
        { code: "forties" as const, label: tr("form.ageForties") },
      ] as const,
    [tr],
  );

  const periodDef = useMemo(
    () =>
      [
        { w: 1 as const, label: tr("form.period1w") },
        { w: 2 as const, label: tr("form.period2w") },
        { w: 4 as const, label: tr("form.period1m") },
        { w: 12 as const, label: tr("form.period3m") },
      ] as const,
    [tr],
  );

  const industryOptions: { value: Industry; label: string }[] = useMemo(
    () => [
      { value: "beauty", label: tr("form.industryBeauty") },
      { value: "retail", label: tr("form.industryRetail") },
      { value: "fmcg", label: tr("form.industryFmcg") },
      { value: "fintech", label: tr("form.industryFintech") },
      { value: "auto", label: tr("form.industryAuto") },
      { value: "entertainment", label: tr("form.industryEntertainment") },
      { value: "other", label: tr("form.industryOther") },
    ],
    [tr],
  );

  const handleSubmit = () => {
    if (ageBands.size === 0) return;
    const target = mapAgeBands(ageBands);
    const regionCodes = [...regions];
    let regionCode: AiRecommendInput["region"] = "all";
    if (regionCodes.length === 1) {
      regionCode = regionCodes[0];
    }

    const input: AiRecommendInput = {
      goal: "awareness",
      target,
      budgetMaxMan: Math.round(budgetMan),
      region: regionCode,
      industry,
      preferredPeriodWeeks: periodWeeks,
    };

    onSubmit({ input, regionCodes });
  };

  const canSubmit = ageBands.size > 0;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border border-gold/25 bg-navy/40 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <CardHeader className="border-b border-gold/20 pb-4">
          <CardTitle className="text-lg font-bold text-white sm:text-xl">
            {tr("form.panelTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-7 pt-6">
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              {tr("form.regionLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {regionDef.map(({ code, label }) => (
                <label
                  key={code}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    regions.has(code)
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-white/15 bg-white/5 text-slate-200 hover:border-white/25",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={regions.has(code)}
                    onChange={() => toggleRegion(code)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold">
              <Target className="h-4 w-4 shrink-0" aria-hidden />
              {tr("form.ageLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {ageDef.map(({ code, label }) => (
                <label
                  key={code}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    ageBands.has(code)
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-white/15 bg-white/5 text-slate-200 hover:border-white/25",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={ageBands.has(code)}
                    onChange={() => toggleAge(code)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold">
              <Wallet className="h-4 w-4 shrink-0" aria-hidden />
              {tr("form.budgetLabel")}
            </div>
            <div className="px-0.5">
              <input
                type="range"
                min={budgetMin}
                max={budgetMax}
                step={50}
                value={budgetMan}
                onChange={(e) => setBudgetMan(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-gold"
                aria-valuemin={budgetMin}
                aria-valuemax={budgetMax}
                aria-valuenow={budgetMan}
              />
              <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-400 sm:text-xs">
                <span className="tabular-nums">
                  {isKo
                    ? `${budgetMin.toLocaleString()}만원`
                    : `${budgetMin.toLocaleString()} (10K)`}
                </span>
                <span className="font-bold text-gold tabular-nums">
                  {isKo
                    ? `${budgetMan.toLocaleString()}만원`
                    : `${budgetMan.toLocaleString()} (10K)`}
                </span>
                <span className="tabular-nums">
                  {isKo
                    ? `${budgetMax.toLocaleString()}만원`
                    : `${budgetMax.toLocaleString()} (10K)`}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden />
              {tr("form.industryLabel")}
            </div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as Industry)}
              className="w-full rounded-xl border border-white/15 bg-navy/60 px-3 py-2.5 text-sm font-medium text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              {industryOptions.map((o) => (
                <option key={o.value} value={o.value} className="bg-navy">
                  {o.label}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              {tr("form.periodLabel")}
            </div>
            <div className="flex flex-wrap gap-2">
              {periodDef.map(({ w, label }) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setPeriodWeeks(w)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    periodWeeks === w
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-white/15 bg-white/5 text-slate-200 hover:border-white/25",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <Button
            type="button"
            size="lg"
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl border border-gold/40 bg-gradient-to-r from-navy to-navy/90 text-base font-bold text-white shadow-md hover:from-navy/95 hover:to-navy/85 disabled:opacity-50"
            onClick={handleSubmit}
          >
            <Sparkles className="mr-2 h-5 w-5 text-gold" aria-hidden />
            {tr("form.submit")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
