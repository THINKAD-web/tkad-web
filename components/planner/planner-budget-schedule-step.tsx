"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CalendarRange, Layers, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media-data";
import type { PlannerMapRegion } from "@/lib/planner-logic";
import { PLANNER_PERIOD_OPTIONS } from "@/lib/planner-period";
import {
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  type PlannerCategory,
} from "@/lib/planner/types";
import { selectBudgetNum, usePlannerStore } from "@/lib/planner/store";
import { PlannerRegionMap } from "@/components/planner-region-map";

type Props = {
  catalog: MediaItem[];
  regionCounts: Record<string, number>;
  mapLabel: (r: PlannerMapRegion) => string;
};

const CATEGORIES: {
  key: PlannerCategory;
  labelKey: "catDigital" | "catStatic" | "catMobile";
}[] = [
  { key: "digital", labelKey: "catDigital" },
  { key: "static", labelKey: "catStatic" },
  { key: "mobile", labelKey: "catMobile" },
];

export function PlannerBudgetScheduleStep({
  catalog,
  regionCounts,
  mapLabel,
}: Props) {
  const t = useTranslations("planner");
  const tm = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  const budget = usePlannerStore((s) => s.budget);
  const budgetNum = usePlannerStore(selectBudgetNum);
  const months = usePlannerStore((s) => s.months);
  const regions = usePlannerStore((s) => s.regions);
  const categories = usePlannerStore((s) => s.categories);
  const flightStart = usePlannerStore((s) => s.flightStart);
  const flightEnd = usePlannerStore((s) => s.flightEnd);
  const setBudget = usePlannerStore((s) => s.setBudget);
  const setMonths = usePlannerStore((s) => s.setMonths);
  const setFlightRange = usePlannerStore((s) => s.setFlightRange);
  const toggleRegion = usePlannerStore((s) => s.toggleRegion);
  const toggleCategory = usePlannerStore((s) => s.toggleCategory);

  const selectedRegions = useMemo(
    () => new Set(regions),
    [regions],
  );
  const categorySet = useMemo(() => new Set(categories), [categories]);

  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + Math.max(1, Math.round(months)));
    return d.toISOString().slice(0, 10);
  }, [months]);

  const startVal = flightStart || new Date().toISOString().slice(0, 10);
  const endVal = flightEnd || defaultEnd;

  return (
    <div className="space-y-6">
      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ STEP 2 / BUDGET · SCHEDULE ]
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <Wallet className="h-5 w-5 text-primary" aria-hidden />
            {t("stepBudgetTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("stepBudgetDesc")}</p>
        </div>
        <div className="space-y-6 p-5">
          <div>
            <div className="mb-3 flex justify-between font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span>{t("budgetSliderMin")}</span>
              <span>{t("budgetSliderMax")}</span>
            </div>
            <input
              type="range"
              min={PLANNER_BUDGET_MIN}
              max={PLANNER_BUDGET_MAX}
              step={500}
              value={budgetNum}
              onChange={(e) => setBudget(e.target.value)}
              className="h-3 w-full cursor-pointer appearance-none border-2 border-border bg-card"
              style={{ accentColor: "#22d3ee" }}
              aria-label={t("budget")}
            />
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-[8rem] flex-1">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  [ {t("budget")} ]
                </label>
                <input
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) =>
                    setBudget(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="mt-1 h-11 w-full border-2 border-border bg-card px-3 font-mono font-bold focus:border-primary focus:outline-none"
                />
              </div>
              <p className="pb-1 font-mono text-[12px] text-muted-foreground">
                {t("budgetPerMonthSummary", {
                  amount: Math.round(budgetNum / Math.max(months, 1)),
                })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                [ {t("flightStartLabel")} ]
              </label>
              <input
                type="date"
                value={startVal}
                onChange={(e) => setFlightRange(e.target.value, endVal)}
                className="mt-1 h-11 w-full border-2 border-border bg-card px-3 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                [ {t("flightEndLabel")} ]
              </label>
              <input
                type="date"
                value={endVal}
                onChange={(e) => setFlightRange(startVal, e.target.value)}
                className="mt-1 h-11 w-full border-2 border-border bg-card px-3 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              <CalendarRange className="h-4 w-4" aria-hidden />
              [ {t("period")} ]
            </p>
            <div className="flex flex-wrap gap-0">
              {PLANNER_PERIOD_OPTIONS.map((opt) => {
                const selected = Math.abs(months - opt.months) < 0.04;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMonths(opt.months)}
                    className={cn(
                      "-mt-[2px] -ml-[2px] border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Layers className="h-5 w-5 text-primary" aria-hidden />
            {t("stepRegionTitle")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("stepRegionDesc")}</p>
        </div>
        <div className="flex flex-wrap gap-0 p-5">
          {CATEGORIES.map(({ key, labelKey }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleCategory(key)}
              className={cn(
                "-mt-[2px] -ml-[2px] border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase",
                categorySet.has(key)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <div className="border-t-2 border-border p-5">
          <PlannerRegionMap
            selected={selectedRegions}
            counts={regionCounts}
            onToggle={toggleRegion}
            labelFor={mapLabel}
            title={t("mapTitle")}
            hint={t("mapHint")}
            countLabel={(n) => t("mapCount", { count: n })}
          />
        </div>
      </div>
    </div>
  );
}
