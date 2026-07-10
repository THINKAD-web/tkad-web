"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Bus,
  ChevronDown,
  Monitor,
  PanelTop,
  Sparkles,
  TrainFront,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { PlannerSeoulZoneChips } from "@/components/planner/planner-seoul-zone-chips";
import { PlannerBusanZoneChips } from "@/components/planner/planner-busan-zone-chips";
import { cn } from "@/lib/utils";
import {
  PLACEMENT_HINT_KEYS,
  type AiRecommendInput,
  type CampaignGoal,
  type Industry,
  type TargetAudience,
} from "@/lib/ai-media-recommend";
import { RECOMMEND_FUNNEL_GOAL_OPTS } from "@/lib/recommend/campaign-goal-options";
import {
  suggestSeoulZones,
  type PlannerSeoulZoneKey,
} from "@/lib/planner/seoul-zones";
import {
  suggestBusanZones,
  type PlannerBusanZoneKey,
} from "@/lib/planner/busan-zones";
import type {
  PlannerCampaignGoal,
  PlannerIndustryKey,
} from "@/lib/planner/types";

export type RegionCheckboxCode =
  | "seoul"
  | "capital"
  | "busan"
  | "jeju"
  | "national";

type AgeBand = "teens" | "twenties" | "thirties" | "forties";
type PeriodWeeks = 1 | 2 | 4 | 12;

type MediaTypeFilter = "all" | "digital" | "static" | "mobile" | "network";

function recommendGoalToPlanner(goal: CampaignGoal): PlannerCampaignGoal {
  switch (goal) {
    case "launch":
      return "launch";
    case "awareness":
      return "brand";
    case "conversion":
    case "consideration":
    default:
      return "sales";
  }
}

function recommendIndustryToPlanner(industry: Industry): PlannerIndustryKey {
  switch (industry) {
    case "beauty":
      return "indFb";
    case "retail":
    case "fmcg":
      return "indRetail";
    case "fintech":
      return "indFinance";
    case "entertainment":
      return "indEnt";
    default:
      return "indOther";
  }
}

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
  regionCodes: RegionCheckboxCode[];
  searchQuery: string;
};

type Props = {
  locale: string;
  onSubmit: (payload: MediaAiRecommendFormSubmit) => void;
};

function FormField({
  label,
  required,
  hint,
  requiredLabel,
  optionalLabel,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  requiredLabel: string;
  optionalLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              required
                ? "bg-violet-500/15 text-violet-700 dark:text-violet-200"
                : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50",
            )}
          >
            {required ? requiredLabel : optionalLabel}
          </span>
        </div>
        {hint ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function chipClass(selected: boolean) {
  return cn(
    "rounded-xl border px-3 py-2 text-sm font-medium transition-colors touch-manipulation",
    selected
      ? "border-violet-500/50 bg-gradient-to-r from-violet-500/15 to-cyan-400/15 text-foreground shadow-sm"
      : "border-gray-200 bg-white text-foreground hover:border-violet-300/50 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-400/30",
  );
}

export default function MediaAiRecommendForm({ locale, onSubmit }: Props) {
  const tr = useTranslations("recommend");
  const tPlacement = useTranslations("recommend.form.placementHints");
  const isKo = locale === "ko";

  const [regions, setRegions] = useState<Set<RegionCheckboxCode>>(
    () => new Set(),
  );
  const [ageBands, setAgeBands] = useState<Set<AgeBand>>(() => new Set());
  const [budgetMan, setBudgetMan] = useState(1000);
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal | null>(null);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [periodWeeks, setPeriodWeeks] = useState<PeriodWeeks | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState<MediaTypeFilter>("all");
  const [placementHints, setPlacementHints] = useState<Set<string>>(
    () => new Set(),
  );
  const [seoulZones, setSeoulZones] = useState<PlannerSeoulZoneKey[]>([]);
  const [seoulZonesTouched, setSeoulZonesTouched] = useState(false);
  const [busanZones, setBusanZones] = useState<PlannerBusanZoneKey[]>([]);
  const [busanZonesTouched, setBusanZonesTouched] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const budgetMin = 100;
  const budgetMax = 10000;

  const requiredMark = tr("form.requiredMark");
  const optionalMark = tr("form.optionalMark");
  const fieldBadge = { requiredLabel: requiredMark, optionalLabel: optionalMark };

  const toggleRegion = useCallback((code: RegionCheckboxCode) => {
    setRegions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        if (code === "seoul") {
          setSeoulZones([]);
          setSeoulZonesTouched(false);
        }
        if (code === "busan") {
          setBusanZones([]);
          setBusanZonesTouched(false);
        }
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const suggestedSeoulZones = useMemo(() => {
    if (!campaignGoal) return [] as PlannerSeoulZoneKey[];
    return suggestSeoulZones(
      recommendGoalToPlanner(campaignGoal),
      recommendIndustryToPlanner(industry ?? "other"),
    );
  }, [campaignGoal, industry]);

  useEffect(() => {
    if (!regions.has("seoul") || seoulZonesTouched || !campaignGoal) return;
    setSeoulZones(suggestedSeoulZones);
  }, [regions, seoulZonesTouched, campaignGoal, suggestedSeoulZones]);

  const suggestedBusanZones = useMemo(() => {
    if (!campaignGoal) return [] as PlannerBusanZoneKey[];
    return suggestBusanZones(
      recommendGoalToPlanner(campaignGoal),
      recommendIndustryToPlanner(industry ?? "other"),
    );
  }, [campaignGoal, industry]);

  useEffect(() => {
    if (!regions.has("busan") || busanZonesTouched || !campaignGoal) return;
    setBusanZones(suggestedBusanZones);
  }, [regions, busanZonesTouched, campaignGoal, suggestedBusanZones]);

  const toggleSeoulZone = useCallback((zone: PlannerSeoulZoneKey) => {
    setSeoulZonesTouched(true);
    setSeoulZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone],
    );
  }, []);

  const clearSeoulZones = useCallback(() => {
    setSeoulZonesTouched(true);
    setSeoulZones([]);
  }, []);

  const applySuggestedSeoulZones = useCallback(() => {
    setSeoulZonesTouched(false);
    setSeoulZones([...suggestedSeoulZones]);
  }, [suggestedSeoulZones]);

  const toggleBusanZone = useCallback((zone: PlannerBusanZoneKey) => {
    setBusanZonesTouched(true);
    setBusanZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone],
    );
  }, []);

  const clearBusanZones = useCallback(() => {
    setBusanZonesTouched(true);
    setBusanZones([]);
  }, []);

  const applySuggestedBusanZones = useCallback(() => {
    setBusanZonesTouched(false);
    setBusanZones([...suggestedBusanZones]);
  }, [suggestedBusanZones]);

  const toggleAge = useCallback((b: AgeBand) => {
    setAgeBands((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }, []);

  const togglePlacementHint = useCallback((code: string) => {
    setPlacementHints((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
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

  const goalOptions = useMemo(
    () =>
      RECOMMEND_FUNNEL_GOAL_OPTS.map((opt) => ({
        value: opt.value,
        label: tr(opt.titleKey),
      })),
    [tr],
  );

  const mediaTypeOptions: { value: MediaTypeFilter; label: string }[] = useMemo(
    () => [
      { value: "all", label: tr("form.mediaTypeAll") },
      { value: "digital", label: tr("form.mediaTypeDigital") },
      { value: "static", label: tr("form.mediaTypeStatic") },
      { value: "mobile", label: tr("form.mediaTypeMobile") },
      { value: "network", label: tr("form.mediaTypeNetwork") },
    ],
    [tr],
  );

  const buildPayload = useCallback(
    (
      goal: CampaignGoal,
      regionSet: Set<RegionCheckboxCode>,
      ageSet: Set<AgeBand>,
      industryVal: Industry | null,
      period: PeriodWeeks | null,
      media: MediaTypeFilter,
      hints: Set<string>,
      budget: number,
      search: string,
      zoneList: readonly PlannerSeoulZoneKey[],
      busanZoneList: readonly PlannerBusanZoneKey[],
    ): MediaAiRecommendFormSubmit => {
      const regionCodes = [...regionSet];
      let regionCode: AiRecommendInput["region"] = "all";
      if (regionCodes.length === 1) {
        regionCode = regionCodes[0];
      }

      const input: AiRecommendInput = {
        goal,
        target: mapAgeBands(ageSet),
        budgetMaxMan: Math.round(budget),
        region: regionCode,
        industry: industryVal ?? "other",
        preferredPeriodWeeks: period ?? 4,
        type: media === "all" ? "all" : media,
        placementHints: hints.size > 0 ? [...hints] : undefined,
        regionCodes: regionCodes.length > 0 ? regionCodes : undefined,
        seoulZones:
          regionSet.has("seoul") && zoneList.length > 0 ? [...zoneList] : undefined,
        busanZones:
          regionSet.has("busan") && busanZoneList.length > 0
            ? [...busanZoneList]
            : undefined,
      };

      return { input, regionCodes, searchQuery: search };
    },
    [],
  );

  const handleSubmit = () => {
    if (!campaignGoal) return;
    onSubmit(
      buildPayload(
        campaignGoal,
        regions,
        ageBands,
        industry,
        periodWeeks,
        mediaType,
        placementHints,
        budgetMan,
        searchQuery,
        seoulZones,
        busanZones,
      ),
    );
  };

  const canSubmit = campaignGoal != null;

  const handleRandomFill = () => {
    const pickRandom = <T,>(arr: readonly T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];

    const randomRegionCodes = (() => {
      const codes = regionDef.map((r) => r.code);
      const count = Math.max(1, Math.min(2, Math.floor(Math.random() * 3)));
      const picked = new Set<RegionCheckboxCode>();
      while (picked.size < count) {
        picked.add(pickRandom(codes));
      }
      return picked;
    })();

    const randomAgeBands = (() => {
      const codes = ageDef.map((a) => a.code);
      const count = Math.max(1, Math.min(2, Math.floor(Math.random() * 3)));
      const picked = new Set<AgeBand>();
      while (picked.size < count) {
        picked.add(pickRandom(codes));
      }
      return picked;
    })();

    const randomHints = (() => {
      const count = Math.floor(Math.random() * 2);
      const picked = new Set<string>();
      while (picked.size < count) {
        picked.add(pickRandom(PLACEMENT_HINT_KEYS));
      }
      return picked;
    })();

    setCampaignGoal(pickRandom(goalOptions).value);
    setRegions(randomRegionCodes);
    setAgeBands(randomAgeBands);
    setIndustry(pickRandom(industryOptions).value);
    setPeriodWeeks(pickRandom(periodDef).w);
    setMediaType(pickRandom(mediaTypeOptions).value);
    setPlacementHints(randomHints);
    setBudgetMan(
      Math.round(
        (budgetMin + Math.random() * (budgetMax - budgetMin)) / 100,
      ) * 100,
    );
  };

  return (
    <div className="mx-auto w-full max-w-xl overflow-x-clip">
      <div className="rounded-2xl border border-gray-200 bg-card text-foreground shadow-sm dark:border-white/10">
        <div className="border-b border-gray-100 p-5 sm:p-6 dark:border-white/10">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            {tr("form.panelTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {tr("form.panelSubtitle")}
          </p>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <FormField
            label={tr("form.goalLabel")}
            required
            hint={tr("form.goalHint")}
            {...fieldBadge}
          >
            <div className="flex flex-wrap gap-2">
              {goalOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCampaignGoal(value)}
                  aria-pressed={campaignGoal === value}
                  className={chipClass(campaignGoal === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField
            label={tr("form.regionLabel")}
            hint={tr("form.regionHint")}
            {...fieldBadge}
          >
            <div className="flex flex-wrap gap-2">
              {regionDef.map(({ code, label }) => (
                <label key={code} className={chipClass(regions.has(code))}>
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
            {regions.has("seoul") ? (
              <PlannerSeoulZoneChips
                embedded
                selected={seoulZones}
                suggested={suggestedSeoulZones}
                isKo={isKo}
                onToggle={toggleSeoulZone}
                onClear={clearSeoulZones}
                onApplySuggested={applySuggestedSeoulZones}
              />
            ) : null}
            {regions.has("busan") ? (
              <PlannerBusanZoneChips
                embedded
                selected={busanZones}
                suggested={suggestedBusanZones}
                isKo={isKo}
                onToggle={toggleBusanZone}
                onClear={clearBusanZones}
                onApplySuggested={applySuggestedBusanZones}
              />
            ) : null}
          </FormField>

          <FormField label={tr("form.ageLabel")} hint={tr("form.ageHint")} {...fieldBadge}>
            <div className="flex flex-wrap gap-2">
              {ageDef.map(({ code, label }) => (
                <label key={code} className={chipClass(ageBands.has(code))}>
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
          </FormField>

          <FormField
            label={tr("form.budgetLabel")}
            required
            hint={tr("form.budgetHint")}
            {...fieldBadge}
          >
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                <span>
                  {isKo
                    ? `${budgetMin.toLocaleString()}만원`
                    : `${budgetMin.toLocaleString()}`}
                </span>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-300">
                  {isKo
                    ? `${budgetMan.toLocaleString()}만원`
                    : `${budgetMan.toLocaleString()}`}
                </span>
                <span>
                  {isKo
                    ? `${budgetMax.toLocaleString()}만원`
                    : `${budgetMax.toLocaleString()}`}
                </span>
              </div>
              <input
                type="range"
                min={budgetMin}
                max={budgetMax}
                step={100}
                value={budgetMan}
                onChange={(e) => setBudgetMan(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-violet-500 dark:bg-white/10"
                aria-valuemin={budgetMin}
                aria-valuemax={budgetMax}
                aria-valuenow={budgetMan}
              />
            </div>
          </FormField>

          <FormField
            label={tr("form.industryLabel")}
            hint={tr("form.industryHint")}
            {...fieldBadge}
          >
            <div className="flex flex-wrap gap-2">
              {industryOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() =>
                    setIndustry((prev) => (prev === o.value ? null : o.value))
                  }
                  aria-pressed={industry === o.value}
                  className={chipClass(industry === o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField
            label={tr("form.periodLabel")}
            hint={tr("form.periodHint")}
            {...fieldBadge}
          >
            <div className="flex flex-wrap gap-2">
              {periodDef.map(({ w, label }) => (
                <button
                  key={w}
                  type="button"
                  onClick={() =>
                    setPeriodWeeks((prev) => (prev === w ? null : w))
                  }
                  aria-pressed={periodWeeks === w}
                  className={chipClass(periodWeeks === w)}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>

          <div className="rounded-xl border border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={advancedOpen}
            >
              <div>
                <p className="text-sm font-semibold">{tr("form.advancedTitle")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {tr("form.advancedHint")}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  advancedOpen && "rotate-180",
                )}
              />
            </button>
            {advancedOpen ? (
              <div className="space-y-5 border-t border-gray-100 px-4 py-4 dark:border-white/10">
                <FormField label={tr("form.searchLabel")} {...fieldBadge}>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tr("form.searchPlaceholder")}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-violet-400/60 focus:outline-none dark:border-white/10 dark:bg-black/20"
                  />
                </FormField>

                <FormField label={tr("form.mediaTypeLabel")} {...fieldBadge}>
                  <div className="flex flex-wrap gap-2">
                    {mediaTypeOptions.map((o) => {
                      const selected = mediaType === o.value;
                      const Icon =
                        o.value === "all"
                          ? Sparkles
                          : o.value === "digital"
                            ? Monitor
                            : o.value === "static"
                              ? PanelTop
                              : o.value === "mobile"
                                ? Bus
                                : TrainFront;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setMediaType(o.value)}
                          className={cn(chipClass(selected), "inline-flex items-center gap-1.5")}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </FormField>

                <FormField label={tr("form.placementHintsLabel")} {...fieldBadge}>
                  <div className="flex flex-wrap gap-2">
                    {PLACEMENT_HINT_KEYS.map((code) => (
                      <label
                        key={code}
                        className={chipClass(placementHints.has(code))}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={placementHints.has(code)}
                          onChange={() => togglePlacementHint(code)}
                        />
                        {tPlacement(code)}
                      </label>
                    ))}
                  </div>
                </FormField>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-white/10">
            <BtnBlock
              variant="accent"
              size="md"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="tkad-ai-recommend-submit w-full py-3"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {tr("form.submit")}
            </BtnBlock>
            {!canSubmit ? (
              <p className="text-center text-xs text-amber-700 dark:text-amber-200/90">
                {tr("form.goalHint")}
              </p>
            ) : null}

            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-muted-foreground">
                {tr("form.randomFillHint")}
              </p>
              <BtnBlock
                variant="secondary"
                size="sm"
                onClick={handleRandomFill}
                className="mt-2 w-full"
              >
                {tr("form.randomFill")}
              </BtnBlock>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
