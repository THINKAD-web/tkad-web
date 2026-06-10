"use client";

import { useCallback, useMemo } from "react";
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
  PLANNER_AGE_KEYS,
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  PLANNER_INDUSTRY_KEYS,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerMapRegion,
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
  portfolioFromManualSelection,
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
import { IntegratedDigitalRecommendationPanel } from "@/components/planner/integrated/digital-recommendation-panel";
import { IntegratedReportStep } from "@/components/planner/integrated/integrated-report-step";
import { IntegratedCampaignDashboard } from "@/components/planner/integrated/integrated-dashboard";
import PlannerTips from "@/components/planner-tips";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";
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
  const ageKey = useIntegratedPlannerStore((s) => s.ageKey);
  const industryKey = useIntegratedPlannerStore((s) => s.industryKey);
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
  const setAgeKey = useIntegratedPlannerStore((s) => s.setAgeKey);
  const setIndustryKey = useIntegratedPlannerStore((s) => s.setIndustryKey);
  const setCampaignMediaIds = useIntegratedPlannerStore(
    (s) => s.setCampaignMediaIds,
  );

  const plannerCatalogItems = useMemo(
    () => catalog.map((m) => mapMediaItemToHomeCatalog(m)),
    [catalog],
  );

  const togglePlannerMedia = useCallback(
    (mediaId: string) => {
      setCampaignMediaIds((prev) =>
        prev.includes(mediaId)
          ? prev.filter((id) => id !== mediaId)
          : [...prev, mediaId],
      );
    },
    [setCampaignMediaIds],
  );

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
  const applyPreset = useIntegratedPlannerStore((s) => s.applyPreset);

  const selectedRegions = useMemo(() => new Set(regions), [regions]);
  const categories = useMemo(() => new Set(categoriesArr), [categoriesArr]);

  const filtered = useMemo(
    () => filterPlannerMediaMulti(catalog, selectedRegions, categories),
    [catalog, selectedRegions, categories],
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
      ageKey,
      industryKey,
      budgetMan: budgetNum,
      months,
      campaignMediaIds,
      setCampaignMediaIds,
    }),
    [
      campaignGoal,
      regions,
      categoriesArr,
      ageKey,
      industryKey,
      budgetNum,
      months,
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

  const portfolio = useMemo(() => {
    if (manualIntersectedPortfolio.length === 0 || budgetNum < PLANNER_BUDGET_MIN)
      return [];
    return portfolioFromManualSelection(
      manualIntersectedPortfolio,
      budgetNum,
      months,
    );
  }, [manualIntersectedPortfolio, budgetNum, months]);

  const selectedMediaOrdered = useMemo(() => {
    const byId = new Map(catalog.map((m) => [m.id, m]));
    return campaignMediaIds
      .map((id) => byId.get(id))
      .filter((m): m is MediaItem => Boolean(m));
  }, [campaignMediaIds, catalog]);

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

  const regionsText = useMemo(
    () =>
      regions
        .map((r) => mapLabel(r as PlannerMapRegion))
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
                goals={GOALS}
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
                <PlannerRegionMap
                  selected={selectedRegions}
                  counts={regionCounts}
                  onToggle={toggleRegion}
                  labelFor={mapLabel}
                  title={t("mapTitle")}
                  hint={t("mapHint")}
                  countLabel={(n) => t("mapCount", { count: n })}
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["premium", "pkgPremium"],
                      ["national", "pkgNational"],
                      ["value", "pkgValue"],
                    ] as const
                  ).map(([id, titleKey]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => applyPreset(id)}
                      className={cn(
                        plannerNeon.selectChip,
                        plannerNeon.selectChipIdle,
                        "p-4 text-left",
                      )}
                    >
                      {t(titleKey)}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-wrap gap-2">
                    {PLANNER_AGE_KEYS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setAgeKey(k)}
                        className={cn(
                          plannerNeon.selectChip,
                          ageKey === k
                            ? plannerNeon.selectChipActive
                            : plannerNeon.selectChipIdle,
                        )}
                      >
                        {t(k)}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PLANNER_INDUSTRY_KEYS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setIndustryKey(k)}
                        className={cn(
                          plannerNeon.selectChip,
                          industryKey === k
                            ? plannerNeon.selectChipActive
                            : plannerNeon.selectChipIdle,
                        )}
                      >
                        {t(k)}
                      </button>
                    ))}
                  </div>
                </div>
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
                    initialTotal={catalog.length}
                    plannerSelectedIds={campaignMediaIds}
                    onPlannerToggleMedia={togglePlannerMedia}
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
                ageText={t(ageKey)}
                industryText={t(industryKey)}
                portfolio={portfolio}
                digitalResult={digitalResult}
                metrics={integratedMetrics}
                logoUrl={creativeUploadedUrl || creativeObjectUrl}
                mediaPlacements={mediaPlacements}
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
