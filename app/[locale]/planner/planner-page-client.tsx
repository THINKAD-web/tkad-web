"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Send,
  Sparkles,
  TrendingUp,
  Wallet,
  CalendarRange,
  ArrowRight,
  MessageCircle,
  Upload,
} from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerMapRegion,
  PLANNER_MAP_REGIONS,
  filterPlannerMediaMulti,
  countPlannerMediaByRegion,
  computePlannerMetrics,
  selectPlannerPortfolio,
  computeBudgetBlurbParts,
  portfolioDailyByCategory,
  estimateCpmByCategory,
  budgetSplitByCategory,
  reachSplitForGoal,
  comparePlansByDuration,
} from "@/lib/planner-logic";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import {
  PlannerImpressionsLineChart,
  PlannerRoiLineChart,
  PlannerDailyReachBarChart,
  PlannerReachDonutChart,
  PlannerBudgetPieChart,
  PlannerCpmCompareChart,
  PlannerMonthCompareChart,
} from "@/components/planner-charts";
import { PlannerRegionMap } from "@/components/planner-region-map";
import { mediaItemDetailPath } from "@/lib/media-network-types";

const BUDGET_MIN = 100;
const BUDGET_MAX = 10_000;
const STORAGE_KEY = "tkad-planner-plan-v2";

const GOALS: {
  key: PlannerCampaignGoal;
  titleKey: string;
  descKey: string;
}[] = [
  { key: "brand", titleKey: "goalBrand", descKey: "goalBrandDesc" },
  { key: "launch", titleKey: "goalLaunch", descKey: "goalLaunchDesc" },
  { key: "event", titleKey: "goalEvent", descKey: "goalEventDesc" },
  { key: "sales", titleKey: "goalSales", descKey: "goalSalesDesc" },
  { key: "local", titleKey: "goalLocal", descKey: "goalLocalDesc" },
];

const CATEGORIES: {
  key: PlannerCategory;
  labelKey: "catDigital" | "catStatic" | "catMobile";
}[] = [
  { key: "digital", labelKey: "catDigital" },
  { key: "static", labelKey: "catStatic" },
  { key: "mobile", labelKey: "catMobile" },
];

const DEFAULT_CATEGORIES: PlannerCategory[] = [
  "digital",
  "static",
  "mobile",
];

function normalizePlannerCategoriesFromStorage(raw: unknown): Set<PlannerCategory> {
  const allowed = new Set<string>(["digital", "static", "mobile"]);
  const legacy: Record<string, PlannerCategory> = {
    billboard: "static",
    bus: "mobile",
    subway: "mobile",
  };
  if (!Array.isArray(raw)) return new Set(DEFAULT_CATEGORIES);
  const next = new Set<PlannerCategory>();
  for (const c of raw) {
    if (typeof c !== "string") continue;
    const mapped = legacy[c] ?? (allowed.has(c) ? (c as PlannerCategory) : null);
    if (mapped === "digital" || mapped === "static" || mapped === "mobile") {
      next.add(mapped);
    }
  }
  return next.size > 0 ? next : new Set(DEFAULT_CATEGORIES);
}

const AGE_KEYS = ["ageAll", "age20s", "age30s", "age40s", "age50plus"] as const;
const INDUSTRY_KEYS = [
  "indFb",
  "indRetail",
  "indTech",
  "indFinance",
  "indEnt",
  "indOther",
] as const;

type Props = {
  catalog: MediaItem[];
  databaseEmpty: boolean;
};

export default function PlannerPageClient({
  catalog,
  databaseEmpty,
}: Props) {
  const t = useTranslations("planner");
  const tm = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();

  const [wizardStep, setWizardStep] = useState(1);
  const [campaignGoal, setCampaignGoal] = useState<PlannerCampaignGoal | null>(
    null,
  );
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    () => new Set<string>(["seoul"]),
  );
  const [categories, setCategories] = useState<Set<PlannerCategory>>(
    () => new Set<PlannerCategory>(DEFAULT_CATEGORIES),
  );
  const [budget, setBudget] = useState<string>("5000");
  const [months, setMonths] = useState<number>(3);
  const [ageKey, setAgeKey] = useState<(typeof AGE_KEYS)[number]>("ageAll");
  const [industryKey, setIndustryKey] =
    useState<(typeof INDUSTRY_KEYS)[number]>("indOther");

  const toggleCategory = (key: PlannerCategory) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleRegion = useCallback((r: PlannerMapRegion) => {
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(r)) {
        if (next.size <= 1) return prev;
        next.delete(r);
      } else {
        next.add(r);
      }
      return next;
    });
  }, []);

  const regionCounts = useMemo(
    () => countPlannerMediaByRegion(catalog, categories),
    [catalog, categories],
  );

  const filtered = useMemo(
    () => filterPlannerMediaMulti(catalog, selectedRegions, categories),
    [catalog, selectedRegions, categories],
  );

  const budgetNum = useMemo(() => {
    const n = Number.parseInt(budget.replace(/,/g, ""), 10);
    if (!Number.isFinite(n)) return BUDGET_MIN;
    return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, n));
  }, [budget]);

  const metrics = useMemo(() => {
    if (filtered.length === 0 || budgetNum < BUDGET_MIN) return null;
    return computePlannerMetrics(filtered, budgetNum, months, {
      campaignGoal,
    });
  }, [filtered, budgetNum, months, campaignGoal]);

  const portfolio = useMemo(() => {
    if (filtered.length === 0 || budgetNum < BUDGET_MIN) return [];
    return selectPlannerPortfolio(filtered, budgetNum, months, 6);
  }, [filtered, budgetNum, months]);

  const blurbParts = useMemo(
    () => computeBudgetBlurbParts(filtered, budgetNum, months),
    [filtered, budgetNum, months],
  );

  const monthCompare = useMemo(
    () => comparePlansByDuration(filtered, budgetNum, [1, 3, 6]),
    [filtered, budgetNum],
  );

  const dailyBars = useMemo(() => {
    const pts = portfolioDailyByCategory(portfolio);
    return pts.map((p) => ({
      key: p.key,
      label: isKo ? p.labelKo : p.labelEn,
      value: p.daily,
    }));
  }, [portfolio, isKo]);

  const cpmBars = useMemo(() => {
    const pts = estimateCpmByCategory(filtered);
    return pts.map((p) => ({
      key: p.key,
      label: isKo ? p.labelKo : p.labelEn,
      value: p.cpm,
    }));
  }, [filtered, isKo]);

  const pieSlices = useMemo(() => {
    const pts = budgetSplitByCategory(portfolio);
    return pts.map((p) => ({
      key: p.key,
      label: isKo ? p.labelKo : p.labelEn,
      pct: p.pct,
    }));
  }, [portfolio, isKo]);

  const reachSplit = reachSplitForGoal(campaignGoal);

  const roiMax = metrics
    ? Math.max(
        metrics.roiOptimistic,
        metrics.roiExpected,
        metrics.roiConservative,
        0.1,
      )
    : 1;

  const quoteHref =
    portfolio.length > 0
      ? `/quote?media=${portfolio.map((m) => m.id).join(",")}`
      : "/quote";

  const applyPreset = (id: "premium" | "national" | "value") => {
    if (id === "premium") {
      setSelectedRegions(new Set<PlannerMapRegion>(["seoul"]));
      setCategories(new Set<PlannerCategory>(["digital", "static"]));
    } else if (id === "national") {
      setSelectedRegions(
        new Set<PlannerMapRegion>(["seoul", "busan", "jeju"]),
      );
      setCategories(new Set<PlannerCategory>(DEFAULT_CATEGORIES));
    } else {
      setSelectedRegions(
        new Set<PlannerMapRegion>(["seoul", "busan", "national"]),
      );
      setCategories(new Set<PlannerCategory>(DEFAULT_CATEGORIES));
    }
    toast("success", isKo ? "프리셋이 적용되었습니다." : "Preset applied.");
  };

  const savePlan = useCallback(() => {
    try {
      const payload = {
        version: 3 as const,
        savedAt: new Date().toISOString(),
        wizardStep,
        campaignGoal,
        regions: [...selectedRegions],
        categories: [...categories],
        budget: budgetNum,
        months,
        ageKey,
        industryKey,
        mediaIds: portfolio.map((m) => m.id),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      toast("success", t("savedToast"));
    } catch {
      toast("error", isKo ? "저장에 실패했습니다." : "Could not save plan.");
    }
  }, [
    wizardStep,
    campaignGoal,
    selectedRegions,
    categories,
    budgetNum,
    months,
    ageKey,
    industryKey,
    portfolio,
    toast,
    t,
    isKo,
  ]);

  const loadPlan = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        toast("error", t("loadNoneToast"));
        return;
      }
      const p = JSON.parse(raw) as Record<string, unknown>;
      if (p.version === 3 || p.version === 2) {
        if (Array.isArray(p.regions))
          setSelectedRegions(new Set(p.regions as string[]));
        setCategories(normalizePlannerCategoriesFromStorage(p.categories));
        if (typeof p.budget === "number") setBudget(String(p.budget));
        if (typeof p.months === "number") setMonths(p.months);
        if (typeof p.campaignGoal === "string")
          setCampaignGoal(p.campaignGoal as PlannerCampaignGoal);
        if (
          typeof p.ageKey === "string" &&
          (AGE_KEYS as readonly string[]).includes(p.ageKey)
        ) {
          setAgeKey(p.ageKey as (typeof AGE_KEYS)[number]);
        }
        if (
          typeof p.industryKey === "string" &&
          (INDUSTRY_KEYS as readonly string[]).includes(p.industryKey)
        ) {
          setIndustryKey(p.industryKey as (typeof INDUSTRY_KEYS)[number]);
        }
        if (typeof p.wizardStep === "number") setWizardStep(p.wizardStep);
        toast("success", t("loadedToast"));
        return;
      }
      if (p.version === 1) {
        const r = p.region as string;
        if (r === "all")
          setSelectedRegions(new Set(PLANNER_MAP_REGIONS));
        else setSelectedRegions(new Set([r]));
        setCategories(normalizePlannerCategoriesFromStorage(p.categories));
        if (typeof p.budget === "number") setBudget(String(p.budget));
        if (typeof p.months === "number") setMonths(p.months);
        setWizardStep(4);
        toast("success", t("loadedToast"));
        return;
      }
      toast("error", t("loadNoneToast"));
    } catch {
      toast("error", t("loadNoneToast"));
    }
  }, [toast, t]);

  const mapLabel = useCallback(
    (r: PlannerMapRegion) =>
      r === "national" ? t("regionNationalShort") : tm(`regions.${r}`),
    [t, tm],
  );

  const goNext = () => {
    if (wizardStep === 1 && !campaignGoal) {
      toast("error", t("selectGoal"));
      return;
    }
    if (wizardStep === 2 && budgetNum < BUDGET_MIN) {
      toast("error", t("needBudget"));
      return;
    }
    if (wizardStep === 3 && selectedRegions.size === 0) {
      toast("error", t("selectRegion"));
      return;
    }
    setWizardStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => setWizardStep((s) => Math.max(1, s - 1));

  if (databaseEmpty && catalog.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <section className="relative overflow-hidden bg-navy py-28 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,213,181,0.12),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Badge className="border-gold/40 bg-gold/15 text-gold">
              THINKAD Planner
            </Badge>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
              {t("subtitle")}
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <p className="text-lg font-semibold text-navy">{t("preparingMedia")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("preparingMediaDesc")}
          </p>
          <Link href="/media" className="mt-8 inline-block">
            <Button className="btn-gold rounded-full px-8">{t("browseMedia")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="relative overflow-hidden bg-navy py-20 text-white sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,213,181,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Badge className="border-gold/40 bg-gold/15 text-gold">
            THINKAD Planner
          </Badge>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
            {t("subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={loadPlan}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("loadPlan")}
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {wizardStep < 4 ? (
          <div className="mb-8 flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-navy">
              {t("stepOf", { current: wizardStep, total: 3 })}
            </p>
            <div className="flex items-center gap-2 sm:gap-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 sm:gap-4">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
                      wizardStep === s
                        ? "bg-gold text-navy shadow-md"
                        : wizardStep > s
                          ? "bg-navy/15 text-navy ring-2 ring-gold/50"
                          : "bg-slate-200 text-muted-foreground",
                    )}
                  >
                    {wizardStep > s ? <Check className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 ? (
                    <div
                      className={cn(
                        "hidden h-0.5 w-8 sm:block sm:w-16",
                        wizardStep > s ? "bg-gold/70" : "bg-slate-200",
                      )}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {wizardStep < 4 ? (
          <div className="mx-auto max-w-3xl space-y-8">
            {wizardStep === 1 ? (
              <Card className="border-navy/10 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-navy">
                    <Sparkles className="h-5 w-5 text-gold" />
                    {t("step1Title")}
                  </CardTitle>
                  <CardDescription>{t("step1Desc")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {GOALS.map(({ key, titleKey, descKey }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCampaignGoal(key)}
                      className={cn(
                        "rounded-2xl border-2 p-4 text-left transition-all",
                        campaignGoal === key
                          ? "border-gold bg-gold/10 shadow-md ring-1 ring-gold/30"
                          : "border-navy/10 bg-white hover:border-navy/25",
                      )}
                    >
                      <p className="font-bold text-navy">{t(titleKey)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(descKey)}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {wizardStep === 2 ? (
              <Card className="border-navy/10 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-navy">
                    <Wallet className="h-5 w-5 text-gold" />
                    {t("step2Title")}
                  </CardTitle>
                  <CardDescription>{t("step2Desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
                      <span>{t("budgetSliderMin")}</span>
                      <span>{t("budgetSliderMax")}</span>
                    </div>
                    <input
                      type="range"
                      min={BUDGET_MIN}
                      max={BUDGET_MAX}
                      step={50}
                      value={budgetNum}
                      onChange={(e) => setBudget(e.target.value)}
                      className="h-2 w-full cursor-pointer accent-gold"
                      aria-label={t("budget")}
                    />
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[8rem]">
                        <label className="text-xs font-semibold text-navy">
                          {t("budget")}
                        </label>
                        <Input
                          inputMode="numeric"
                          value={budget}
                          onChange={(e) =>
                            setBudget(e.target.value.replace(/[^\d]/g, ""))
                          }
                          className="mt-1 h-11 border-navy/15 font-semibold"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground pb-1">
                        {t("budgetPerMonthSummary", {
                          amount: Math.round(budgetNum / Math.max(months, 1)),
                        })}
                      </p>
                    </div>
                    {blurbParts ? (
                      <p className="mt-3 rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 text-xs leading-relaxed text-navy">
                        {t("budgetBlurb", {
                          name: blurbParts.sampleName.slice(0, 32),
                          price: blurbParts.samplePrice,
                          slots: blurbParts.slotsAtMonth,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-navy">
                      <CalendarRange className="h-4 w-4 text-gold" />
                      {t("period")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 6, 12].map((m) => (
                        <Button
                          key={m}
                          type="button"
                          variant={months === m ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "rounded-full",
                            months === m && "btn-gold border-0",
                          )}
                          onClick={() => setMonths(m)}
                        >
                          {t("periodMonthsShort", { n: m })}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {wizardStep === 3 ? (
              <div className="space-y-6">
                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-navy">
                      <Layers className="h-5 w-5 text-gold" />
                      {t("category")}
                    </CardTitle>
                    <CardDescription>{t("mediaMixHint")}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {CATEGORIES.map(({ key, labelKey }) => (
                      <Button
                        key={key}
                        type="button"
                        variant={categories.has(key) ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "rounded-full touch-manipulation",
                          categories.has(key) && "btn-gold border-0",
                        )}
                        onClick={() => toggleCategory(key)}
                      >
                        {t(labelKey)}
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                <PlannerRegionMap
                  selected={selectedRegions}
                  counts={regionCounts}
                  onToggle={toggleRegion}
                  labelFor={mapLabel}
                  title={t("mapTitle")}
                  hint={t("mapHint")}
                  countLabel={(n) => t("mapCount", { count: n })}
                />

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm text-navy">
                      {t("packagesTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        ["premium", "pkgPremium", "pkgPremiumDesc"],
                        ["national", "pkgNational", "pkgNationalDesc"],
                        ["value", "pkgValue", "pkgValueDesc"],
                      ] as const
                    ).map(([id, titleKey, descKey]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => applyPreset(id)}
                        className="rounded-xl border border-navy/10 bg-slate-50/80 p-3 text-left text-xs transition hover:border-gold/40 hover:bg-white"
                      >
                        <p className="font-bold text-navy">{t(titleKey)}</p>
                        <p className="mt-1 text-muted-foreground">
                          {t(descKey)}
                        </p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-bold text-navy">
                      {t("ageLabel")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {AGE_KEYS.map((k) => (
                        <Button
                          key={k}
                          type="button"
                          size="sm"
                          variant={ageKey === k ? "default" : "outline"}
                          className={cn(
                            "rounded-full text-xs",
                            ageKey === k && "btn-gold border-0",
                          )}
                          onClick={() => setAgeKey(k)}
                        >
                          {t(k)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-bold text-navy">
                      {t("industryLabel")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {INDUSTRY_KEYS.map((k) => (
                        <Button
                          key={k}
                          type="button"
                          size="sm"
                          variant={industryKey === k ? "default" : "outline"}
                          className={cn(
                            "rounded-full text-xs",
                            industryKey === k && "btn-gold border-0",
                          )}
                          onClick={() => setIndustryKey(k)}
                        >
                          {t(k)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-navy/20"
                onClick={goBack}
                disabled={wizardStep <= 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("back")}
              </Button>
              <Button
                type="button"
                className="btn-gold rounded-full px-8 font-semibold"
                onClick={goNext}
              >
                {wizardStep === 3 ? (
                  <>
                    {t("runSimulation")}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    {t("next")}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-navy/20 sm:w-auto"
                onClick={() => setWizardStep(3)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t("editInputs")}
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-navy/20"
                  onClick={savePlan}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("ctaSave")}
                </Button>
                <Button className="btn-gold rounded-full font-semibold" asChild>
                  <Link href={quoteHref}>
                    <Send className="mr-2 h-4 w-4" />
                    {t("ctaQuoteWithPlan")}
                  </Link>
                </Button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <Card className="border-dashed border-navy/20 bg-slate-50/80">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">{t("emptyFilter")}</p>
                  <Button
                    type="button"
                    className="mt-4 rounded-full"
                    variant="outline"
                    onClick={() => setWizardStep(3)}
                  >
                    {t("editInputs")}
                  </Button>
                </CardContent>
              </Card>
            ) : budgetNum < BUDGET_MIN ? (
              <Card className="border-dashed border-gold/30 bg-gold/5">
                <CardContent className="py-10 text-center text-navy">
                  {t("needBudget")}
                </CardContent>
              </Card>
            ) : metrics ? (
              <>
                <p className="rounded-xl border border-navy/10 bg-white px-4 py-3 text-sm text-navy shadow-sm">
                  <span className="font-semibold text-muted-foreground">
                    {t("targetSummaryLabel")}
                  </span>
                  {": "}
                  {(() => {
                    const g = GOALS.find((x) => x.key === campaignGoal);
                    return g ? t(g.titleKey) : "—";
                  })()}
                  {" · "}
                  {t("ageLabel")}: {t(ageKey)} · {t("industryLabel")}:{" "}
                  {t(industryKey)}
                </p>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-navy">{t("comboTitle")}</CardTitle>
                    <CardDescription>{t("comboHint")}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolio.map((m) => (
                      <Link
                        key={m.id}
                        href={mediaItemDetailPath(m.id)}
                        className="rounded-xl border border-navy/10 bg-white p-3 shadow-sm transition hover:border-gold/40 hover:shadow-md"
                      >
                        <p className="line-clamp-2 text-sm font-bold text-navy">
                          {isKo ? m.name : m.nameEn || m.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tm(`regions.${m.region}`)} ·{" "}
                          {isKo
                            ? m.location.slice(0, 40)
                            : (m.locationEn || m.location).slice(0, 40)}
                        </p>
                        <p className="mt-2 text-sm font-bold text-gold-dark">
                          ₩{m.price.toLocaleString()}
                          <span className="text-xs font-medium text-navy/60">
                            {isKo ? "만/월" : " ₩10K/mo"}
                          </span>
                        </p>
                      </Link>
                    ))}
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-navy/10 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-navy">{t("results")}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-navy/10 bg-white p-4">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("matchedMedia")}
                        </p>
                        <p className="mt-1 text-2xl font-extrabold text-navy">
                          {filtered.length}
                          <span className="ml-1 text-base font-semibold text-muted-foreground">
                            {t("countUnit")}
                          </span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-navy/10 bg-white p-4">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("avgMonthlySlot")}
                        </p>
                        <p className="mt-1 text-2xl font-extrabold text-navy">
                          {Math.round(metrics.avgMonthlyPrice).toLocaleString()}
                          <span className="ml-1 text-sm font-medium text-muted-foreground">
                            {isKo ? "만원/월" : "₩10K/mo"}
                          </span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-navy/10 bg-white p-4 sm:col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("estMonthlyImp")}
                        </p>
                        <p className="mt-1 text-2xl font-extrabold text-gold-dark">
                          {metrics.estimatedMonthlyImpressions.toLocaleString()}
                        </p>
                        <p className="mt-3 text-xs font-medium text-muted-foreground">
                          {t("estTotalImp")}
                        </p>
                        <p className="mt-1 text-xl font-bold text-navy">
                          {metrics.estimatedTotalImpressions.toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-navy/10 shadow-lg">
                    <CardContent className="pt-6">
                      <PlannerReachDonutChart
                        corePct={reachSplit.corePct}
                        extendedPct={reachSplit.extendedPct}
                        title={t("chartReachTitle")}
                        coreLabel={t("reachCore")}
                        extendedLabel={t("reachExtended")}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-navy">
                      {t("chartDailyBarTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlannerDailyReachBarChart
                      data={dailyBars}
                      title={t("chartDailyBarTitle")}
                      valueLabel={t("chartDailyBarAxis")}
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="border-navy/10 shadow-lg">
                    <CardContent className="pt-6">
                      <PlannerBudgetPieChart
                        data={pieSlices}
                        title={t("chartBudgetPieTitle")}
                        unitLabel={t("chartBudgetPieUnit")}
                      />
                    </CardContent>
                  </Card>
                  <Card className="border-navy/10 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-navy">
                        {t("chartCpmTitle")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PlannerCpmCompareChart
                        data={cpmBars}
                        title={t("chartCpmTitle")}
                        unitLabel={t("chartCpmUnit")}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-navy">
                      {t("chartMonthCompareTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PlannerMonthCompareChart
                      data={monthCompare.map((x) => ({
                        months: x.months,
                        total: x.totalImpressions,
                      }))}
                      title={t("chartMonthCompareTitle")}
                      barLabels={[
                        t("monthCompare1"),
                        t("monthCompare3"),
                        t("monthCompare6"),
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-navy">
                      <TrendingUp className="h-5 w-5 text-gold" />
                      {t("roiTitle")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(
                      [
                        ["roiConservative", metrics.roiConservative],
                        ["roiExpected", metrics.roiExpected],
                        ["roiOptimistic", metrics.roiOptimistic],
                      ] as const
                    ).map(([labelKey, val]) => (
                      <div key={labelKey}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-navy">
                            {t(labelKey)}
                          </span>
                          <span className="font-bold text-gold-dark">
                            {val}
                            {t("roiUnit")}
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-navy to-gold transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (val / roiMax) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-navy">
                      {t("chartImpLineTitle")}
                    </CardTitle>
                    <CardDescription>{t("chartImpTitle")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlannerImpressionsLineChart
                      data={metrics.cumulativeByMonth}
                      isKo={isKo}
                      title={t("chartImpLineTitle")}
                    />
                  </CardContent>
                </Card>

                <Card className="border-navy/10 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-navy">
                      {t("chartRoiLineTitle")}
                    </CardTitle>
                    <CardDescription>{t("chartRoiLineHint")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PlannerRoiLineChart
                      data={metrics.roiByMonth}
                      isKo={isKo}
                      title={t("chartRoiLineTitle")}
                      hint={t("chartRoiLineHint")}
                      legendConservative={t("roiConservative")}
                      legendExpected={t("roiExpected")}
                      legendOptimistic={t("roiOptimistic")}
                      roiUnit={t("roiUnit")}
                    />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-gradient-to-br from-navy via-navy to-navy-dark text-white shadow-xl">
                  <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                    <div className="max-w-xl space-y-2">
                      <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                        {t("ctaBannerTitle")}
                      </h3>
                      <p className="text-sm leading-relaxed text-white/75">
                        {t("ctaBannerDesc")}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[240px]">
                      <Button
                        size="lg"
                        className="h-12 w-full rounded-full bg-gold font-bold text-navy shadow-lg hover:bg-gold-light"
                        asChild
                      >
                        <Link href={quoteHref}>
                          <Send className="mr-2 h-4 w-4" />
                          {t("ctaQuoteWithPlan")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Link href="/contact" className="w-full">
                        <Button
                          size="lg"
                          variant="outline"
                          className="h-12 w-full rounded-full border-white/40 bg-white/10 font-semibold text-white hover:bg-white/20"
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          {t("ctaContact")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}

            <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
              {t("disclaimer")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
