"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Send,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabs } from "@/components/layout/sub-tabs";
import { PLANNING_TABS } from "@/lib/navigation/sub-page-tabs";
import PlannerCampaignStep1 from "@/components/planner-campaign-step1";
import { MediaSearchPage } from "@/components/media/media-search-page";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import PlannerSimulationStep3 from "@/components/planner-simulation-step3";
import { PlannerRegionMap } from "@/components/planner-region-map";
import {
  buildPlannerRegionOptions,
  filterCatalogByPlannerRegions,
  plannerRegionLabel,
} from "@/lib/planner/planner-regions";
import {
  PLANNER_AGE_KEYS,
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  PLANNER_INDUSTRY_KEYS,
  type PlannerCampaignGoal,
  type PlannerCategory,
} from "@/lib/planner/types";
import {
  INTEGRATED_LAST_INPUT_STEP as LAST_STEP,
} from "@/lib/planner/integrated-types";
import {
  selectIntegratedBudgetNum,
  useIntegratedPlannerStore,
} from "@/lib/planner/integrated-store";
import { canProceedIntegratedStep } from "@/lib/planner/integrated-validation";
import {
  countPlannerMediaByRegion,
  filterPlannerMediaMulti,
  resolvePlannerPortfolio,
  orderPlannerSelectedMedia,
  computePlannerPortfolioBudgetStatus,
} from "@/lib/planner-logic";
import { buildPlannerRecommendationCatalog } from "@/lib/planner/recommendation-catalog";
import { PLANNER_PERIOD_OPTIONS } from "@/lib/planner-period";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import { recommendDigitalChannels } from "@/lib/planner/recommend-digital";
import { computeIntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { MediaItem } from "@/lib/media-data";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { IntegratedPlannerStepper } from "@/components/planner/integrated/integrated-stepper";
import { PlannerRecommendationPanel } from "@/components/planner/recommendation-panel";
import { PlannerSelectedMediaBar } from "@/components/planner/planner-selected-media-bar";
import { IntegratedDigitalRecommendationPanel } from "@/components/planner/integrated/digital-recommendation-panel";
import { IntegratedReportStep } from "@/components/planner/integrated/integrated-report-step";
import { IntegratedCampaignDashboard } from "@/components/planner/integrated/integrated-dashboard";
import PlannerTips from "@/components/planner-tips";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";
import { PlannerScenarioCards } from "@/components/planner/planner-scenario-cards";
import { PlannerGoalFollowUpPanel } from "@/components/planner/planner-goal-follow-up-panel";
import { PlannerSeoulZoneChips } from "@/components/planner/planner-seoul-zone-chips";
import { suggestSeoulZones } from "@/lib/planner/seoul-zones";
import {
  generateScenarios,
  scenarioInputKey,
} from "@/lib/planner/generate-scenarios";
import type { PlannerScenario } from "@/lib/planner/scenario-types";
import { resolveScenarioPortfolioMediaIds } from "@/lib/planner/apply-scenario-portfolio";
import type { HomeAppearance } from "@/lib/home-appearance";
import type { ReactNode } from "react";

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

function IntegratedPlannerPageBody({
  appearance,
  className,
  children,
}: {
  appearance: HomeAppearance;
  className?: string;
  children: ReactNode;
}) {
  const inner = (
    <div className={cn("tkad-planner-neon w-full min-w-0 max-w-full", className)}>
      {children}
    </div>
  );
  if (appearance === "night") {
    return (
      <div className="relative w-full min-w-0 overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#020202] dark:text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 tkad-neon-depth"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 tkad-neon-grid"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
        />
        <div className="relative w-full min-w-0">{inner}</div>
      </div>
    );
  }
  return inner;
}

export default function IntegratedPlannerPageClient({
  catalog,
  databaseEmpty,
}: Props) {
  const t = useTranslations("planner");
  const ti = useTranslations("plannerIntegrated");
  const tm = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();
  const landingAppearance = useTkadAppearance();

  const wizardStep = useIntegratedPlannerStore((s) => s.wizardStep);
  const campaignGoal = useIntegratedPlannerStore((s) => s.campaignGoal);
  const regions = useIntegratedPlannerStore((s) => s.regions);
  const categoriesArr = useIntegratedPlannerStore((s) => s.categories);
  const budget = useIntegratedPlannerStore((s) => s.budget);
  const budgetNum = useIntegratedPlannerStore(selectIntegratedBudgetNum);
  const months = useIntegratedPlannerStore((s) => s.months);
  const ageKeys = useIntegratedPlannerStore((s) => s.ageKeys);
  const industryKey = useIntegratedPlannerStore((s) => s.industryKey);
  const seoulZones = useIntegratedPlannerStore((s) => s.seoulZones);
  const goalFollowUp = useIntegratedPlannerStore((s) => s.goalFollowUp);
  const appliedScenario = useIntegratedPlannerStore((s) => s.appliedScenario);
  const campaignMediaIds = useIntegratedPlannerStore((s) => s.campaignMediaIds);
  const digitalChannelIds = useIntegratedPlannerStore((s) => s.digitalChannelIds);
  const digitalBudgetPct = useIntegratedPlannerStore((s) => s.digitalBudgetPct);
  const creativeObjectUrl = useIntegratedPlannerStore((s) => s.creativeObjectUrl);
  const creativeUploadedUrl = useIntegratedPlannerStore(
    (s) => s.creativeUploadedUrl,
  );
  const mediaPlacements = useIntegratedPlannerStore((s) => s.mediaPlacements);

  const setWizardStep = useIntegratedPlannerStore((s) => s.setWizardStep);
  const goNextStep = useIntegratedPlannerStore((s) => s.goNextStep);
  const goPrevStep = useIntegratedPlannerStore((s) => s.goPrevStep);
  const setCampaignGoal = useIntegratedPlannerStore((s) => s.setCampaignGoal);
  const toggleRegion = useIntegratedPlannerStore((s) => s.toggleRegion);
  const toggleCategory = useIntegratedPlannerStore((s) => s.toggleCategory);
  const setBudget = useIntegratedPlannerStore((s) => s.setBudget);
  const setMonths = useIntegratedPlannerStore((s) => s.setMonths);
  const toggleAgeKey = useIntegratedPlannerStore((s) => s.toggleAgeKey);
  const setIndustryKey = useIntegratedPlannerStore((s) => s.setIndustryKey);
  const toggleSeoulZone = useIntegratedPlannerStore((s) => s.toggleSeoulZone);
  const clearSeoulZones = useIntegratedPlannerStore((s) => s.clearSeoulZones);
  const applySuggestedSeoulZones = useIntegratedPlannerStore(
    (s) => s.applySuggestedSeoulZones,
  );
  const setGoalFollowUp = useIntegratedPlannerStore((s) => s.setGoalFollowUp);
  const setCampaignMediaIds = useIntegratedPlannerStore(
    (s) => s.setCampaignMediaIds,
  );

  const plannerBrowseCatalog = useMemo(() => {
    if (regions.length === 0) return catalog;
    return filterCatalogByPlannerRegions(catalog, regions);
  }, [catalog, regions]);

  const plannerCatalogItems = useMemo(
    () => plannerBrowseCatalog.map((m) => mapMediaItemToHomeCatalog(m)),
    [plannerBrowseCatalog],
  );

  const [mediaCacheById, setMediaCacheById] = useState<Record<string, MediaItem>>(
    {},
  );

  const togglePlannerMedia = useCallback(
    (mediaId: string, media?: MediaItem) => {
      if (media) {
        setMediaCacheById((prev) =>
          prev[media.id] === media ? prev : { ...prev, [media.id]: media },
        );
      }
      setCampaignMediaIds((prev) =>
        prev.includes(mediaId)
          ? prev.filter((id) => id !== mediaId)
          : [...prev, mediaId],
      );
    },
    [setCampaignMediaIds],
  );

  const removePlannerMedia = useCallback(
    (mediaId: string) => {
      setCampaignMediaIds((prev) => prev.filter((id) => id !== mediaId));
    },
    [setCampaignMediaIds],
  );

  const clearPlannerMedia = useCallback(() => {
    setCampaignMediaIds([]);
  }, [setCampaignMediaIds]);

  const setCreativeObjectUrl = useIntegratedPlannerStore(
    (s) => s.setCreativeObjectUrl,
  );
  const setCreativeUploadedUrl = useIntegratedPlannerStore(
    (s) => s.setCreativeUploadedUrl,
  );
  const setMediaPlacement = useIntegratedPlannerStore((s) => s.setMediaPlacement);
  const clearMediaPlacement = useIntegratedPlannerStore(
    (s) => s.clearMediaPlacement,
  );
  const applyScenarioAction = useIntegratedPlannerStore((s) => s.applyScenario);

  const selectedRegions = useMemo(() => new Set(regions), [regions]);
  const categories = useMemo(() => new Set(categoriesArr), [categoriesArr]);

  const filtered = useMemo(
    () =>
      filterPlannerMediaMulti(
        catalog,
        selectedRegions,
        categories,
        seoulZones,
      ),
    [catalog, selectedRegions, categories, seoulZones],
  );

  const suggestedSeoulZones = useMemo(
    () => suggestSeoulZones(campaignGoal, industryKey),
    [campaignGoal, industryKey],
  );

  const recommendationCatalog = useMemo(
    () =>
      buildPlannerRecommendationCatalog(
        catalog,
        filtered,
        selectedRegions,
        categories,
      ),
    [catalog, filtered, selectedRegions, categories],
  );

  const recommendationStore = useMemo(
    () => ({
      goal: campaignGoal,
      regions,
      categories: categoriesArr,
      ageKeys,
      industryKey,
      budgetMan: budgetNum,
      months,
      goalFollowUp,
      seoulZones,
      campaignMediaIds,
      setCampaignMediaIds,
    }),
    [
      campaignGoal,
      regions,
      categoriesArr,
      ageKeys,
      industryKey,
      budgetNum,
      months,
      goalFollowUp,
      seoulZones,
      campaignMediaIds,
      setCampaignMediaIds,
    ],
  );

  const categoriesSummary = useMemo(() => {
    if (categoriesArr.length === 0) return isKo ? "전체" : "All";
    const labelByKey: Record<string, string> = {
      digital: t("catDigital"),
      static: t("catStatic"),
      mobile: t("catMobile"),
    };
    return categoriesArr.map((c) => labelByKey[c] ?? c).join(isKo ? ", " : ", ");
  }, [categoriesArr, isKo, t]);

  const regionCounts = useMemo(
    () => countPlannerMediaByRegion(catalog, categories),
    [catalog, categories],
  );

  const selectedMediaOrdered = useMemo(
    () =>
      orderPlannerSelectedMedia(
        catalog,
        campaignMediaIds,
        mediaCacheById,
      ),
    [campaignMediaIds, catalog, mediaCacheById],
  );

  const portfolio = useMemo(
    () =>
      resolvePlannerPortfolio({
        campaignMediaIds,
        selectedMediaOrdered,
        filtered,
        budgetMan: budgetNum,
        months,
        mediaSelectionExplicit: campaignMediaIds.length > 0,
        recommendCtx: {
          goal: campaignGoal,
          regions,
          seoulZones,
          categories: categoriesArr,
          ageKeys,
          industryKey,
          budgetMan: budgetNum,
          months,
          goalFollowUp,
        },
      }),
    [
      campaignMediaIds,
      selectedMediaOrdered,
      filtered,
      budgetNum,
      months,
      campaignGoal,
      regions,
      seoulZones,
      categoriesArr,
      ageKeys,
      industryKey,
      goalFollowUp,
    ],
  );

  const portfolioBudgetStatus = useMemo(
    () => computePlannerPortfolioBudgetStatus(portfolio, budgetNum, months),
    [portfolio, budgetNum, months],
  );

  const digitalResult = useMemo(
    () =>
      recommendDigitalChannels({
        goal: campaignGoal,
        regions,
        portfolio,
        budgetMan: budgetNum,
        digitalBudgetPct,
        selectedChannelIds: digitalChannelIds,
      }),
    [
      campaignGoal,
      regions,
      portfolio,
      budgetNum,
      digitalBudgetPct,
      digitalChannelIds,
    ],
  );

  const integratedMetrics = useMemo(
    () =>
      computeIntegratedCampaignMetrics({
        portfolio,
        budgetMan: budgetNum,
        months,
        digitalBudgetPct,
        digitalChannelIds,
        regions,
        goal: campaignGoal,
      }),
    [
      portfolio,
      budgetNum,
      months,
      digitalBudgetPct,
      digitalChannelIds,
      regions,
      campaignGoal,
    ],
  );

  const regionOptions = useMemo(
    () =>
      buildPlannerRegionOptions(regionCounts, locale).map((o) => ({
        id: o.id,
        label: isKo ? o.labelKo : o.labelEn,
        count: o.count,
      })),
    [regionCounts, locale, isKo],
  );

  const ageSummary = useMemo(() => {
    if (ageKeys.length === 0) return t("ageAll");
    return ageKeys.map((k) => t(k)).join(", ");
  }, [ageKeys, t]);

  const scenarioInput = useMemo(
    () => ({
      goal: campaignGoal,
      industryKey,
      regions,
      ageKeys,
      locale,
    }),
    [campaignGoal, industryKey, regions, ageKeys, locale],
  );

  const scenarioInputMemoKey = useMemo(
    () => scenarioInputKey(scenarioInput),
    [scenarioInput],
  );

  const recommendedScenarios = useMemo(
    () => generateScenarios(scenarioInput),
    [scenarioInput],
  );

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSelectedScenarioId(null);
  }, [scenarioInputMemoKey]);

  const scenarioVariantLabels = useMemo(
    () => ({
      efficiency: t("scenarioEfficiency"),
      balanced: t("scenarioBalanced"),
      premium: t("scenarioPremium"),
    }),
    [t],
  );

  const selectScenario = useCallback((scenario: PlannerScenario) => {
    setSelectedScenarioId(scenario.id);
  }, []);

  const applyScenario = useCallback(
    (scenario: PlannerScenario) => {
      const patch = {
        regions: scenario.regions,
        categories: scenario.categories,
        budgetMan: scenario.budgetMan,
        months: scenario.months,
        districtHints: scenario.districtHints,
        campaignGoal,
        industryKey,
        ageKeys,
        goalFollowUp,
      };
      const mediaIds = resolveScenarioPortfolioMediaIds(catalog, patch);
      applyScenarioAction({
        ...patch,
        campaignMediaIds: mediaIds,
        appliedScenario: {
          id: scenario.id,
          variant: scenario.variant,
          labelKo: scenario.labelKo,
          labelEn: scenario.labelEn,
          descriptionKo: scenario.descriptionKo,
          descriptionEn: scenario.descriptionEn,
        },
      });
      setSelectedScenarioId(scenario.id);
      setWizardStep(4);
      toast(
        "success",
        mediaIds.length > 0
          ? t("scenarioAppliedWithMedia", { count: mediaIds.length })
          : t("scenarioAppliedNoMedia"),
      );
    },
    [
      applyScenarioAction,
      catalog,
      campaignGoal,
      industryKey,
      ageKeys,
      goalFollowUp,
      setWizardStep,
      toast,
      t,
    ],
  );

  const mapLabel = useCallback(
    (r: string) =>
      plannerRegionLabel(r, locale, t("regionNationalShort")),
    [locale, t],
  );

  const mediaRegionLabel = useCallback(
    (region: string) => plannerRegionLabel(region, locale, t("regionNationalShort")),
    [locale, t],
  );

  const regionsText = useMemo(
    () =>
      regions
        .map((r) => mapLabel(r))
        .join(isKo ? ", " : ", "),
    [regions, mapLabel, isKo],
  );

  const goalTitle = useMemo(() => {
    const g = GOALS.find((x) => x.key === campaignGoal);
    return g ? t(g.titleKey) : "—";
  }, [campaignGoal, t]);

  const periodDisplay = useMemo(
    () =>
      formatPlannerPeriodDisplay(months, (key, values) =>
        values != null ? t(key, values) : t(key),
      ),
    [months, t],
  );

  const goNext = useCallback(() => {
    const check = canProceedIntegratedStep(
      useIntegratedPlannerStore.getState(),
      wizardStep,
    );
    if (!check.ok) {
      toast("error", check.errorKey === "needDigitalChannel" ? ti("needDigitalChannel") : t(check.errorKey as "selectGoal"));
      return;
    }
    goNextStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [wizardStep, goNextStep, toast, t, ti]);

  if (databaseEmpty) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold">{t("preparingMedia")}</h1>
        <p className="mt-2 text-muted-foreground">{t("preparingMediaDesc")}</p>
      </div>
    );
  }

  return (
    <HomeLandingDayNight>
    <div className="tkad-landing-neon w-full min-w-0 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <PageHero
        eyebrow="// 02 · PLANNING"
        title="OOH + 디지털 "
        highlight="통합 플래너"
        description="온·오프라인 통합 캠페인을 한 번에 설계하세요"
      />
      <SubTabs tabs={PLANNING_TABS} currentPath="/planner/integrated" />

      <IntegratedPlannerPageBody
        appearance={landingAppearance}
        className="mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12"
      >
        {wizardStep <= LAST_STEP ? (
          <IntegratedPlannerStepper
            currentStep={wizardStep}
            stepOfLabel={ti("stepOf", {
              current: wizardStep,
              total: LAST_STEP,
            })}
            onStepClick={(s) => setWizardStep(s)}
          />
        ) : null}

        {wizardStep <= LAST_STEP ? (
          <div className="mx-auto w-full min-w-0 max-w-3xl space-y-8 overflow-x-clip">
            <PlannerTips
              variant="integrated"
              wizardStep={wizardStep}
              campaignGoal={campaignGoal}
              campaignMediaCount={campaignMediaIds.length}
              hasCreative={Boolean(creativeObjectUrl || creativeUploadedUrl)}
              budgetNum={budgetNum}
            />

            {wizardStep === 1 ? (
              <PlannerCampaignStep1
                campaignGoal={campaignGoal}
                onSelectGoal={setCampaignGoal}
              />
            ) : null}

            {wizardStep === 2 ? (
              <div className="space-y-6">
                <div>
                  <PlannerNeonLabel>{ti("step2Label")}</PlannerNeonLabel>
                  <h2 className={cn("mt-2 text-xl font-bold", plannerNeon.headline)}>
                    {t("stepRegionTitle")}
                  </h2>
                </div>
                <PlannerNeonCard>
                  <div className="flex flex-wrap gap-2 p-5">
                    {CATEGORIES.map(({ key, labelKey }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCategory(key)}
                        className={cn(
                          plannerNeon.selectChip,
                          categories.has(key)
                            ? plannerNeon.selectChipActive
                            : plannerNeon.selectChipIdle,
                        )}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </PlannerNeonCard>

                <PlannerNeonCard>
                  <div className={plannerNeon.cardHeader}>
                    <PlannerNeonLabel>{t("industryLabel")}</PlannerNeonLabel>
                  </div>
                  <div className="flex flex-wrap gap-2 p-5 sm:p-6">
                    {PLANNER_INDUSTRY_KEYS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setIndustryKey(k)}
                        className={cn(
                          plannerNeon.selectChip,
                          "touch-manipulation",
                          industryKey === k
                            ? plannerNeon.selectChipActive
                            : plannerNeon.selectChipIdle,
                        )}
                      >
                        {t(k)}
                      </button>
                    ))}
                  </div>
                </PlannerNeonCard>

                <PlannerGoalFollowUpPanel
                  goal={campaignGoal}
                  followUp={goalFollowUp}
                  onChange={setGoalFollowUp}
                  isKo={isKo}
                />

                <PlannerRegionMap
                  selected={selectedRegions}
                  regionOptions={regionOptions}
                  onToggle={toggleRegion}
                  title={t("mapTitle")}
                  hint={t("mapHint")}
                  countLabel={(n) => t("mapCount", { count: n })}
                />

                {selectedRegions.has("seoul") ? (
                  <PlannerSeoulZoneChips
                    selected={seoulZones}
                    suggested={suggestedSeoulZones}
                    isKo={isKo}
                    onToggle={toggleSeoulZone}
                    onClear={clearSeoulZones}
                    onApplySuggested={applySuggestedSeoulZones}
                  />
                ) : null}

                <div>
                  <PlannerNeonLabel className="mb-3 block">
                    {t("ageLabel")}
                  </PlannerNeonLabel>
                  <p className={cn("mb-3 text-xs", plannerNeon.subtext)}>
                    {isKo
                      ? "복수 선택 가능 · 미선택 시 전 연령"
                      : "Multi-select · empty means all ages"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PLANNER_AGE_KEYS.map((k) => {
                      const selected =
                        k === "ageAll"
                          ? ageKeys.length === 0
                          : ageKeys.includes(k);
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            if (k === "ageAll") toggleAgeKey("ageAll");
                            else toggleAgeKey(k);
                          }}
                          className={cn(
                            plannerNeon.selectChip,
                            "touch-manipulation",
                            selected
                              ? plannerNeon.selectChipActive
                              : plannerNeon.selectChipIdle,
                          )}
                        >
                          {t(k)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <PlannerScenarioCards
                  scenarios={recommendedScenarios}
                  selectedId={selectedScenarioId}
                  onSelect={selectScenario}
                  onApply={applyScenario}
                  isKo={isKo}
                  title={t("scenariosTitle")}
                  hint={t("scenariosHint")}
                  applyLabel={t("scenarioApply")}
                  variantLabels={scenarioVariantLabels}
                />
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <PlannerNeonCard>
                <div className={plannerNeon.cardHeader}>
                  <PlannerNeonLabel>{ti("step3Label")}</PlannerNeonLabel>
                  <h3 className={cn("mt-2 flex items-center gap-2 text-lg font-bold", plannerNeon.headline)}>
                    <Wallet className="h-5 w-5 text-violet-400" />
                    {t("stepBudgetTitle")}
                  </h3>
                </div>
                <div className="space-y-6 p-5 sm:p-6">
                  <input
                    type="range"
                    min={PLANNER_BUDGET_MIN}
                    max={PLANNER_BUDGET_MAX}
                    step={500}
                    value={budgetNum}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full accent-violet-500"
                  />
                  <input
                    inputMode="numeric"
                    value={budget}
                    onChange={(e) =>
                      setBudget(e.target.value.replace(/[^\d]/g, ""))
                    }
                    className="h-11 w-full rounded-xl border px-3 font-bold dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    {PLANNER_PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMonths(opt.months)}
                        className={cn(
                          plannerNeon.selectChip,
                          Math.abs(months - opt.months) < 0.04
                            ? plannerNeon.selectChipActive
                            : plannerNeon.selectChipIdle,
                        )}
                      >
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </PlannerNeonCard>
            ) : null}

            {wizardStep === 4 ? (
              <div className="min-w-0 space-y-6 overflow-x-clip">
                <div className="space-y-2 text-center sm:text-left">
                  <PlannerNeonLabel>{ti("step4Label")}</PlannerNeonLabel>
                  <h2 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
                    {t("stepMediaTitle")}
                  </h2>
                  <p className={plannerNeon.subtext}>{t("stepMediaDesc")}</p>
                </div>

                <PlannerSelectedMediaBar
                  catalog={catalog}
                  campaignMediaIds={campaignMediaIds}
                  onRemove={removePlannerMedia}
                  onClearAll={clearPlannerMedia}
                  isKo={isKo}
                />

                <PlannerRecommendationPanel
                  catalog={recommendationCatalog}
                  isKo={isKo}
                  regionLabel={mediaRegionLabel}
                  store={recommendationStore}
                />

                <div className="space-y-2 border-t dark:border-white/10 border-gray-100 pt-6">
                  <PlannerNeonLabel>Manual Browse</PlannerNeonLabel>
                  <h3 className={cn("text-base", plannerNeon.headline)}>
                    {t("recommendBrowseTitle")}
                  </h3>
                  <p className={plannerNeon.subtext}>{t("recommendBrowseDesc")}</p>
                </div>
                <div className="min-w-0 max-w-full overflow-x-clip">
                  <MediaSearchPage
                    embedded
                    plannerMode
                    initialMedia={plannerCatalogItems}
                    initialCatalogItems={plannerBrowseCatalog}
                    initialTotal={plannerBrowseCatalog.length}
                    plannerSelectedIds={campaignMediaIds}
                    onPlannerToggleMedia={togglePlannerMedia}
                    onPlannerClearMedia={clearPlannerMedia}
                  />
                </div>
              </div>
            ) : null}

            {wizardStep === 5 ? (
              <div className="space-y-6">
                <div>
                  <PlannerNeonLabel>{ti("step5Label")}</PlannerNeonLabel>
                  <h2 className={cn("text-xl font-bold", plannerNeon.headline)}>
                    {ti("digitalTabTitle")}
                  </h2>
                  <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
                    {ti("digitalTabDesc")}
                  </p>
                </div>
                <IntegratedDigitalRecommendationPanel
                  portfolio={portfolio}
                  isKo={isKo}
                />
              </div>
            ) : null}

            {wizardStep === 6 ? (
              <PlannerSimulationStep3
                selectedMedia={selectedMediaOrdered}
                creativeObjectUrl={creativeObjectUrl}
                setCreativeObjectUrl={setCreativeObjectUrl}
                creativeUploadedUrl={creativeUploadedUrl}
                setCreativeUploadedUrl={setCreativeUploadedUrl}
                mediaPlacements={mediaPlacements}
                setMediaPlacement={setMediaPlacement}
                clearMediaPlacement={clearMediaPlacement}
              />
            ) : null}

            {wizardStep === 7 && integratedMetrics ? (
              <IntegratedReportStep
                isKo={isKo}
                campaignGoal={campaignGoal}
                goalTitle={goalTitle}
                budgetNum={budgetNum}
                months={months}
                periodDisplay={periodDisplay}
                regionsText={regionsText}
                categoriesText={categoriesSummary}
                ageText={ageSummary}
                industryText={t(industryKey)}
                goalFollowUp={goalFollowUp}
                portfolio={portfolio}
                digitalResult={digitalResult}
                metrics={integratedMetrics}
                logoUrl={creativeUploadedUrl || creativeObjectUrl}
                mediaPlacements={mediaPlacements}
                appliedScenario={appliedScenario}
                scenarioVariantLabels={scenarioVariantLabels}
              />
            ) : null}

            <div className="flex w-full min-w-0 max-w-full flex-col-reverse gap-3 border-t dark:border-white/10 border-gray-100 pt-6 sm:flex-row sm:justify-between">
              <BtnBlock
                variant="secondary"
                size="md"
                className="w-full min-w-0 sm:w-auto"
                onClick={goPrevStep}
                disabled={wizardStep <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("back")}
              </BtnBlock>
              <BtnBlock
                variant="accent"
                size="md"
                className="tkad-planner-wizard-btn-accent w-full min-w-0 sm:w-auto"
                onClick={goNext}
              >
                {wizardStep === LAST_STEP ? (
                  <>
                    {ti("viewDashboard")}
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    {t("next")}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </BtnBlock>
            </div>
          </div>
        ) : integratedMetrics ? (
          <div className="mx-auto w-full min-w-0 max-w-3xl space-y-8 overflow-x-clip">
            <PlannerTips
              variant="integrated"
              wizardStep={8}
              campaignGoal={campaignGoal}
              campaignMediaCount={campaignMediaIds.length}
              hasCreative={Boolean(creativeObjectUrl || creativeUploadedUrl)}
              budgetNum={budgetNum}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BtnBlock
                variant="secondary"
                size="md"
                onClick={() => setWizardStep(LAST_STEP)}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("back")}
              </BtnBlock>
              <div className="flex flex-wrap gap-2">
                <BtnBlock href="/contact" variant="accent" size="md">
                  <Send className="h-4 w-4" />
                  {t("ctaQuote")}
                </BtnBlock>
                <BtnBlock href="/planner" variant="secondary" size="md">
                  {ti("oohOnlyPlanner")}
                </BtnBlock>
              </div>
            </div>
            <IntegratedCampaignDashboard
              metrics={integratedMetrics}
              isKo={isKo}
              months={Math.round(months)}
            />
            <p className="text-center text-xs text-muted-foreground">
              {t("disclaimer")}
            </p>
          </div>
        ) : null}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {ti("classicPlannerLink")}{" "}
          <Link href="/planner" className="font-semibold text-primary underline">
            {t("title")}
          </Link>
        </p>
      </IntegratedPlannerPageBody>
    </div>
    </HomeLandingDayNight>
  );
}
