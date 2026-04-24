"use client";

import { useCallback, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Download,
  Layers,
  Send,
  TrendingUp,
  Wallet,
  CalendarRange,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
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
  portfolioFromManualSelection,
} from "@/lib/planner-logic";
import { PLANNER_PERIOD_OPTIONS } from "@/lib/planner-period";
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
import PlannerCampaignStep1 from "@/components/planner-campaign-step1";
import PlannerMediaSelector from "@/components/planner-media-selector";
import PlannerTips from "@/components/planner-tips";
import PlannerSimulationStep3 from "@/components/planner-simulation-step3";
import PlannerReportStep, {
  PlannerReportPdfCompact,
} from "@/components/planner-report-step";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { PlannerStepper } from "@/components/planner/stepper";
import {
  PLANNER_AGE_KEYS,
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  PLANNER_INDUSTRY_KEYS,
  PLANNER_LAST_INPUT_STEP,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerMapRegion,
} from "@/lib/planner/types";
import { selectBudgetNum, usePlannerStore } from "@/lib/planner/store";
import { canProceedFromStep } from "@/lib/planner/validation";

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

  const wizardStep = usePlannerStore((s) => s.wizardStep);
  const campaignGoal = usePlannerStore((s) => s.campaignGoal);
  const regions = usePlannerStore((s) => s.regions);
  const categoriesArr = usePlannerStore((s) => s.categories);
  const budget = usePlannerStore((s) => s.budget);
  const budgetNum = usePlannerStore(selectBudgetNum);
  const months = usePlannerStore((s) => s.months);
  const ageKey = usePlannerStore((s) => s.ageKey);
  const industryKey = usePlannerStore((s) => s.industryKey);
  const campaignMediaIds = usePlannerStore((s) => s.campaignMediaIds);
  const creativeObjectUrl = usePlannerStore((s) => s.creativeObjectUrl);

  const setWizardStep = usePlannerStore((s) => s.setWizardStep);
  const goNextStepAction = usePlannerStore((s) => s.goNextStep);
  const goPrevStepAction = usePlannerStore((s) => s.goPrevStep);
  const setCampaignGoal = usePlannerStore((s) => s.setCampaignGoal);
  const toggleRegion = usePlannerStore((s) => s.toggleRegion);
  const toggleCategoryAction = usePlannerStore((s) => s.toggleCategory);
  const setBudget = usePlannerStore((s) => s.setBudget);
  const setMonths = usePlannerStore((s) => s.setMonths);
  const setAgeKey = usePlannerStore((s) => s.setAgeKey);
  const setIndustryKey = usePlannerStore((s) => s.setIndustryKey);
  const setCampaignMediaIds = usePlannerStore((s) => s.setCampaignMediaIds);
  const setCreativeObjectUrl = usePlannerStore((s) => s.setCreativeObjectUrl);
  const applyPresetAction = usePlannerStore((s) => s.applyPreset);

  const selectedRegions = useMemo(() => new Set(regions), [regions]);
  const categories = useMemo(
    () => new Set<PlannerCategory>(categoriesArr),
    [categoriesArr],
  );

  const toggleCategory = useCallback(
    (key: PlannerCategory) => toggleCategoryAction(key),
    [toggleCategoryAction],
  );

  const regionCounts = useMemo(
    () => countPlannerMediaByRegion(catalog, categories),
    [catalog, categories],
  );

  const filtered = useMemo(
    () => filterPlannerMediaMulti(catalog, selectedRegions, categories),
    [catalog, selectedRegions, categories],
  );

  const selectedMediaForSimulation = useMemo(() => {
    if (campaignMediaIds.length === 0) return [];
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const out: MediaItem[] = [];
    for (const id of campaignMediaIds) {
      const m = byId.get(id);
      if (m) out.push(m);
    }
    return out;
  }, [campaignMediaIds, catalog]);

  const manualIntersectedPortfolio = useMemo(() => {
    if (campaignMediaIds.length === 0) return [];
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const allowed = new Set(filtered.map((m) => m.id));
    const ordered: MediaItem[] = [];
    for (const id of campaignMediaIds) {
      const m = byId.get(id);
      if (m && allowed.has(id)) ordered.push(m);
    }
    return ordered;
  }, [campaignMediaIds, catalog, filtered]);

  const metrics = useMemo(() => {
    if (filtered.length === 0 || budgetNum < PLANNER_BUDGET_MIN) return null;
    return computePlannerMetrics(filtered, budgetNum, months, {
      campaignGoal,
    });
  }, [filtered, budgetNum, months, campaignGoal]);

  const portfolio = useMemo(() => {
    if (filtered.length === 0 || budgetNum < PLANNER_BUDGET_MIN) return [];
    if (manualIntersectedPortfolio.length > 0) {
      return portfolioFromManualSelection(
        manualIntersectedPortfolio,
        budgetNum,
        months,
      );
    }
    return selectPlannerPortfolio(filtered, budgetNum, months, 6);
  }, [filtered, budgetNum, months, manualIntersectedPortfolio]);

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

  const goalTitle = useMemo(() => {
    const g = GOALS.find((x) => x.key === campaignGoal);
    return g ? t(g.titleKey) : "—";
  }, [campaignGoal, t]);

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

  const applyPreset = useCallback(
    (id: "premium" | "national" | "value") => {
      applyPresetAction(id);
      toast("success", isKo ? "프리셋이 적용되었습니다." : "Preset applied.");
    },
    [applyPresetAction, toast, isKo],
  );

  /**
   * 입력 상태는 Zustand persist 가 매 변경마다 localStorage 에 자동 저장한다.
   * 이 버튼은 사용자에게 명시적 "저장되었다" 피드백을 제공하는 용도로만 유지 —
   * PR-2 이후 DB 기반 플랜 저장/공유로 대체될 자리.
   */
  const savePlan = useCallback(() => {
    toast("success", t("savedToast"));
  }, [toast, t]);

  const mapLabel = useCallback(
    (r: PlannerMapRegion) =>
      r === "national" ? t("regionNationalShort") : tm(`regions.${r}`),
    [t, tm],
  );

  const mediaRegionLabel = useCallback(
    (region: string) =>
      region === "national"
        ? t("regionNationalShort")
        : tm(`regions.${region}`),
    [t, tm],
  );

  const regionsSummary = useMemo(
    () =>
      [...selectedRegions]
        .map((r) => mapLabel(r as PlannerMapRegion))
        .join(", "),
    [selectedRegions, mapLabel],
  );

  const categoriesSummary = useMemo(
    () =>
      CATEGORIES.filter((c) => categories.has(c.key))
        .map((c) => t(c.labelKey))
        .join(", "),
    [categories, t],
  );

  const goNext = useCallback(() => {
    const check = canProceedFromStep(
      usePlannerStore.getState(),
      wizardStep,
    );
    if (!check.ok) {
      toast("error", t(check.errorKey));
      return;
    }
    goNextStepAction();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [goNextStepAction, wizardStep, toast, t]);

  const goBack = useCallback(() => {
    goPrevStepAction();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [goPrevStepAction]);

  if (databaseEmpty && catalog.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <section className="relative overflow-hidden bg-navy py-28 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,213,181,0.12),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <Badge className="border-gold/40 bg-gold/15 text-gold">
                THINKAD Planner
              </Badge>
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                BETA
              </span>
            </div>
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
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Badge className="border-gold/40 bg-gold/15 text-gold">
              THINKAD Planner
            </Badge>
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              BETA
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {wizardStep <= PLANNER_LAST_INPUT_STEP ? (
          <PlannerStepper
            currentStep={wizardStep}
            stepOfLabel={t("stepOf", {
              current: wizardStep,
              total: PLANNER_LAST_INPUT_STEP,
            })}
          />
        ) : null}

        {wizardStep <= PLANNER_LAST_INPUT_STEP ? (
          <div
            className={cn(
              "mx-auto space-y-8",
              // 매체 선택·소재 업로드·보고서 단계는 넓은 캔버스 필요
              wizardStep === 4 || wizardStep === 5 || wizardStep === 6
                ? "max-w-6xl"
                : "max-w-3xl",
            )}
          >
            <PlannerTips
              wizardStep={wizardStep}
              campaignGoal={campaignGoal}
              campaignMediaCount={campaignMediaIds.length}
              hasCreative={Boolean(creativeObjectUrl)}
              budgetNum={budgetNum}
            />

            {/* Step 1 — 캠페인 목표 */}
            {wizardStep === 1 ? (
              <PlannerCampaignStep1
                campaignGoal={campaignGoal}
                goals={GOALS}
                onSelectGoal={setCampaignGoal}
              />
            ) : null}

            {/* Step 2 — 타깃 · 지역 */}
            {wizardStep === 2 ? (
              <div className="space-y-6">
                <div className="space-y-2 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-navy sm:text-xl">
                    {t("stepRegionTitle")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("stepRegionDesc")}
                  </p>
                </div>

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
                      {PLANNER_AGE_KEYS.map((k) => (
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
                      {PLANNER_INDUSTRY_KEYS.map((k) => (
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

            {/* Step 3 — 예산 · 기간 */}
            {wizardStep === 3 ? (
              <Card className="border-navy/10 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-navy">
                    <Wallet className="h-5 w-5 text-gold" />
                    {t("stepBudgetTitle")}
                  </CardTitle>
                  <CardDescription>{t("stepBudgetDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
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
                      {PLANNER_PERIOD_OPTIONS.map((opt) => {
                        const selected = Math.abs(months - opt.months) < 0.04;
                        return (
                          <Button
                            key={opt.id}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "rounded-full",
                              selected && "btn-gold border-0",
                            )}
                            onClick={() => setMonths(opt.months)}
                          >
                            {t(opt.labelKey)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Step 4 — 매체 선택 (PR-3에서 AI 추천 얹음) */}
            {wizardStep === 4 ? (
              <>
                <div className="space-y-2 text-center sm:text-left">
                  <h2 className="text-lg font-bold text-navy sm:text-xl">
                    {t("stepMediaTitle")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("stepMediaDesc")}
                  </p>
                </div>
                <PlannerMediaSelector
                  catalog={catalog}
                  campaignMediaIds={campaignMediaIds}
                  setCampaignMediaIds={setCampaignMediaIds}
                  isKo={isKo}
                  regionLabel={mediaRegionLabel}
                />
              </>
            ) : null}

            {/* Step 5 — 로고 업로드 + 합성 미리보기 */}
            {wizardStep === 5 ? (
              <PlannerSimulationStep3
                selectedMedia={selectedMediaForSimulation}
                creativeObjectUrl={creativeObjectUrl}
                setCreativeObjectUrl={setCreativeObjectUrl}
              />
            ) : null}

            {wizardStep === 6 ? (
              <PlannerReportStep
                isKo={isKo}
                campaignGoal={campaignGoal}
                goalTitle={goalTitle}
                budgetNum={budgetNum}
                months={months}
                regionsText={regionsSummary}
                categoriesText={categoriesSummary}
                ageText={t(ageKey)}
                industryText={t(industryKey)}
                portfolio={portfolio}
                metrics={metrics}
                reachCorePct={reachSplit.corePct}
                reachExtendedPct={reachSplit.extendedPct}
              />
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
                {wizardStep === 6 ? (
                  <>
                    {t("viewEffectDashboard")}
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
            <PlannerTips
              wizardStep={7}
              campaignGoal={campaignGoal}
              campaignMediaCount={campaignMediaIds.length}
              hasCreative={Boolean(creativeObjectUrl)}
              budgetNum={budgetNum}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-navy/20 sm:w-auto"
                onClick={() => setWizardStep(2)}
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
                    onClick={() => setWizardStep(2)}
                  >
                    {t("editInputs")}
                  </Button>
                </CardContent>
              </Card>
            ) : budgetNum < PLANNER_BUDGET_MIN ? (
              <Card className="border-dashed border-gold/30 bg-gold/5">
                <CardContent className="py-10 text-center text-navy">
                  {t("needBudget")}
                </CardContent>
              </Card>
            ) : metrics ? (
              <>
                <div className="flex flex-col gap-2 rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="shrink-0 border-amber-300/80 bg-white font-semibold text-amber-950"
                    >
                      {t("estimatedModelBadge")}
                    </Badge>
                    <span className="min-w-0 text-left text-xs leading-relaxed text-amber-950/95 sm:text-sm">
                      {t("estimatedModelHint")}
                    </span>
                  </div>
                </div>

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
                    <CardDescription>
                      {manualIntersectedPortfolio.length > 0
                        ? t("comboHintManual")
                        : t("comboHint")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolio.map((m) => (
                      <Link
                        key={m.id}
                        href={mediaItemDetailPath(m.id)}
                        className="rounded-xl border border-navy/10 bg-white p-3 shadow-sm transition hover:border-gold/40 hover:shadow-md"
                      >
                        <p className="line-clamp-2 text-sm font-bold text-navy">
                          {isKo ? m.name : (m.nameEn || m.name) || m.name}
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

                <PlannerReportPdfCompact
                  isKo={isKo}
                  campaignGoal={campaignGoal}
                  goalTitle={goalTitle}
                  budgetNum={budgetNum}
                  months={months}
                  regionsText={regionsSummary}
                  categoriesText={categoriesSummary}
                  ageText={t(ageKey)}
                  industryText={t(industryKey)}
                  portfolio={portfolio}
                  metrics={metrics}
                  reachCorePct={reachSplit.corePct}
                  reachExtendedPct={reachSplit.extendedPct}
                />
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
