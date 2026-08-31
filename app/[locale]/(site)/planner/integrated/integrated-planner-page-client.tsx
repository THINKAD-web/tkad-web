"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Send,
} from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_PRIMARY,
  STICKY_ACTION_BAR_ROW,
  StickyActionBar,
} from "@/components/sticky-action-bar";
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
import type { DigitalChannel } from "@/lib/planner/digital-channels";
import type { DigitalCatalogBridgeMeta } from "@/lib/planner/digital-catalog-bridge";
import { computeIntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import { buildIntegratedMixRequest } from "@/lib/integrated/build-mix-request";
import {
  mapMixToDigitalRecommendResult,
  mergeMixIntoIntegratedMetrics,
} from "@/lib/integrated/map-mix-to-ui";
import { buildIntegratedMixPlanTransfer } from "@/lib/integrated/contact-handoff";
import { useIntegratedMix } from "@/hooks/use-integrated-mix";
import { savePlanTransferData } from "@/lib/planner-contact-transfer";
import { IntegratedMixErrorBanner } from "@/components/planner/integrated/integrated-mix-error-banner";
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
import { PlannerScenarioCards } from "@/components/planner/planner-scenario-cards";
import { PlannerGoalFollowUpPanel } from "@/components/planner/planner-goal-follow-up-panel";
import { PlannerSeoulZoneChips } from "@/components/planner/planner-seoul-zone-chips";
import { PlannerBusanZoneChips } from "@/components/planner/planner-busan-zone-chips";
import { PlannerGyeonggiZoneChips } from "@/components/planner/planner-gyeonggi-zone-chips";
import { PlannerIncheonZoneChips } from "@/components/planner/planner-incheon-zone-chips";
import { suggestSeoulZones } from "@/lib/planner/seoul-zones";
import { suggestBusanZones } from "@/lib/planner/busan-zones";
import { suggestGyeonggiZones } from "@/lib/planner/gyeonggi-zones";
import { suggestIncheonZones } from "@/lib/planner/incheon-zones";
import {
  generateScenarios,
  scenarioInputKey,
} from "@/lib/planner/generate-scenarios";
import type { PlannerScenario } from "@/lib/planner/scenario-types";
import { resolveScenarioPortfolioMediaIds } from "@/lib/planner/apply-scenario-portfolio";
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
  digitalChannels: DigitalChannel[];
  digitalCatalogMeta: DigitalCatalogBridgeMeta;
};

/**
 * 낮/밤 외형은 `html.dark` 파생(Tailwind `dark:`) — night 전용 배경·노이즈는 dark 에서만.
 * 라이트에선 배경 투명·오버레이 미표시로 과거 day(래퍼 없음)와 동일하게 보인다.
 */
function IntegratedPlannerPageBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative w-full min-w-0 overflow-hidden dark:bg-[#020202] dark:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--qp-accent)_8%,transparent),transparent_55%)] dark:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden tkad-hero-noise opacity-[0.05] mix-blend-overlay dark:block"
      />
      <div className="relative w-full min-w-0">
        <div
          className={cn("tkad-planner-neon w-full min-w-0 max-w-full", className)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function IntegratedPlannerPageClient({
  catalog,
  databaseEmpty,
  digitalChannels,
  digitalCatalogMeta,
}: Props) {
  const t = useTranslations("planner");
  const ti = useTranslations("plannerIntegrated");
  const tm = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const localeKey = isKo ? "ko" : "en";
  const router = useRouter();
  const { toast } = useToast();
  const [navigatingContact, setNavigatingContact] = useState(false);

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
  const busanZones = useIntegratedPlannerStore((s) => s.busanZones);
  const gyeonggiZones = useIntegratedPlannerStore((s) => s.gyeonggiZones);
  const incheonZones = useIntegratedPlannerStore((s) => s.incheonZones);
  const goalFollowUp = useIntegratedPlannerStore((s) => s.goalFollowUp);
  const appliedScenario = useIntegratedPlannerStore((s) => s.appliedScenario);
  const campaignMediaIds = useIntegratedPlannerStore((s) => s.campaignMediaIds);
  const campaignMediaQuantities = useIntegratedPlannerStore(
    (s) => s.campaignMediaQuantities,
  );
  const campaignMediaPriceOptionIndex = useIntegratedPlannerStore(
    (s) => s.campaignMediaPriceOptionIndex,
  );
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
  const toggleBusanZone = useIntegratedPlannerStore((s) => s.toggleBusanZone);
  const clearBusanZones = useIntegratedPlannerStore((s) => s.clearBusanZones);
  const applySuggestedBusanZones = useIntegratedPlannerStore(
    (s) => s.applySuggestedBusanZones,
  );
  const toggleGyeonggiZone = useIntegratedPlannerStore((s) => s.toggleGyeonggiZone);
  const clearGyeonggiZones = useIntegratedPlannerStore((s) => s.clearGyeonggiZones);
  const applySuggestedGyeonggiZones = useIntegratedPlannerStore(
    (s) => s.applySuggestedGyeonggiZones,
  );
  const toggleIncheonZone = useIntegratedPlannerStore((s) => s.toggleIncheonZone);
  const clearIncheonZones = useIntegratedPlannerStore((s) => s.clearIncheonZones);
  const applySuggestedIncheonZones = useIntegratedPlannerStore(
    (s) => s.applySuggestedIncheonZones,
  );
  const setGoalFollowUp = useIntegratedPlannerStore((s) => s.setGoalFollowUp);
  const setCampaignMediaIds = useIntegratedPlannerStore(
    (s) => s.setCampaignMediaIds,
  );
  const setCampaignMediaQuantity = useIntegratedPlannerStore(
    (s) => s.setCampaignMediaQuantity,
  );
  const setCampaignMediaPriceOptionIndex = useIntegratedPlannerStore(
    (s) => s.setCampaignMediaPriceOptionIndex,
  );

  const portfolioPricing = useMemo(
    () => ({
      quantities: campaignMediaQuantities,
      priceOptionIndex: campaignMediaPriceOptionIndex,
    }),
    [campaignMediaQuantities, campaignMediaPriceOptionIndex],
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
        busanZones,
        gyeonggiZones,
        incheonZones,
      ),
    [catalog, selectedRegions, categories, seoulZones, busanZones, gyeonggiZones, incheonZones],
  );

  const suggestedSeoulZones = useMemo(
    () => suggestSeoulZones(campaignGoal, industryKey),
    [campaignGoal, industryKey],
  );

  const suggestedBusanZones = useMemo(
    () => suggestBusanZones(campaignGoal, industryKey),
    [campaignGoal, industryKey],
  );

  const suggestedGyeonggiZones = useMemo(
    () => suggestGyeonggiZones(campaignGoal, industryKey),
    [campaignGoal, industryKey],
  );

  const suggestedIncheonZones = useMemo(
    () => suggestIncheonZones(campaignGoal, industryKey),
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
      busanZones,
      gyeonggiZones,
      incheonZones,
      campaignMediaIds,
      campaignMediaQuantities,
      campaignMediaPriceOptionIndex,
      setCampaignMediaQuantity,
      setCampaignMediaPriceOptionIndex,
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
      busanZones,
      gyeonggiZones,
      incheonZones,
      campaignMediaIds,
      campaignMediaQuantities,
      campaignMediaPriceOptionIndex,
      setCampaignMediaQuantity,
      setCampaignMediaPriceOptionIndex,
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
          busanZones,
      gyeonggiZones,
      incheonZones,
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
      busanZones,
      gyeonggiZones,
      categoriesArr,
      ageKeys,
      industryKey,
      goalFollowUp,
    ],
  );

  const portfolioBudgetStatus = useMemo(
    () =>
      computePlannerPortfolioBudgetStatus(
        portfolio,
        budgetNum,
        months,
        portfolioPricing,
      ),
    [portfolio, budgetNum, months, portfolioPricing],
  );

  const mixRequest = useMemo(
    () =>
      buildIntegratedMixRequest({
        campaignGoal,
        industryKey,
        regions,
        ageKeys,
        budgetMan: budgetNum,
        months,
        digitalBudgetPct,
        selectedOohMediaIds: campaignMediaIds,
        locale: localeKey,
      }),
    [
      campaignGoal,
      industryKey,
      regions,
      ageKeys,
      budgetNum,
      months,
      digitalBudgetPct,
      campaignMediaIds,
      localeKey,
    ],
  );

  const mixEnabled =
    wizardStep >= 5 &&
    portfolio.length > 0 &&
    campaignGoal != null &&
    mixRequest != null;

  const {
    data: mixResult,
    loading: mixLoading,
    error: mixError,
    refetch: refetchMix,
  } = useIntegratedMix(mixRequest, mixEnabled);

  const fallbackDigitalResult = useMemo(
    () =>
      recommendDigitalChannels({
        goal: campaignGoal,
        regions,
        portfolio,
        budgetMan: budgetNum,
        digitalBudgetPct,
        selectedChannelIds: digitalChannelIds,
        channels: digitalChannels,
      }),
    [
      campaignGoal,
      regions,
      portfolio,
      budgetNum,
      digitalBudgetPct,
      digitalChannelIds,
      digitalChannels,
    ],
  );

  const digitalResult = useMemo(() => {
    if (!mixResult) return fallbackDigitalResult;
    return mapMixToDigitalRecommendResult({
      mix: mixResult,
      portfolio,
      regions,
      budgetMan: budgetNum,
      selectedChannelIds: digitalChannelIds,
      digitalChannels,
      isKo,
    });
  }, [
    mixResult,
    fallbackDigitalResult,
    portfolio,
    regions,
    budgetNum,
    digitalChannelIds,
    digitalChannels,
    isKo,
  ]);

  const baseIntegratedMetrics = useMemo(
    () =>
      computeIntegratedCampaignMetrics({
        portfolio,
        budgetMan: budgetNum,
        months,
        digitalBudgetPct,
        digitalChannelIds,
        regions,
        goal: campaignGoal,
        pricing: portfolioPricing,
        digitalChannels,
      }),
    [
      portfolio,
      budgetNum,
      months,
      digitalBudgetPct,
      digitalChannelIds,
      regions,
      campaignGoal,
      portfolioPricing,
      digitalChannels,
    ],
  );

  const integratedMetrics = useMemo(() => {
    if (!baseIntegratedMetrics) return null;
    if (!mixResult) return baseIntegratedMetrics;
    return mergeMixIntoIntegratedMetrics(
      baseIntegratedMetrics,
      mixResult,
      digitalChannelIds,
      digitalChannels,
    );
  }, [
    baseIntegratedMetrics,
    mixResult,
    digitalChannelIds,
    digitalChannels,
  ]);

  const goToIntegratedContact = useCallback(() => {
    if (navigatingContact) return;
    if (mixResult) {
      savePlanTransferData(
        buildIntegratedMixPlanTransfer({
          mix: mixResult,
          portfolio,
          campaignGoal,
          regions,
          months,
          budgetTotalWon: budgetNum * 10_000,
          isKo,
        }),
      );
    } else if (portfolio.length > 0) {
      savePlanTransferData({
        mediaIds: portfolio.map((m) => m.id),
        mediaNames: portfolio.map((m) =>
          isKo ? m.name : m.nameEn || m.name,
        ),
        totalBudget: budgetNum * 10_000,
        duration: Math.max(1, Math.round(months)),
        region: regions.join(", ") || undefined,
        goal: campaignGoal ?? undefined,
        source: "integrated",
      });
    }
    setNavigatingContact(true);
    router.push("/contact?from=integrated");
    setNavigatingContact(false);
  }, [
    navigatingContact,
    mixResult,
    portfolio,
    campaignGoal,
    regions,
    months,
    budgetNum,
    isKo,
    router,
  ]);

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
          <div className="mx-auto w-full min-w-0 max-w-3xl space-y-8 overflow-x-clip pb-28">
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

                {selectedRegions.has("busan") ? (
                  <PlannerBusanZoneChips
                    selected={busanZones}
                    suggested={suggestedBusanZones}
                    isKo={isKo}
                    onToggle={toggleBusanZone}
                    onClear={clearBusanZones}
                    onApplySuggested={applySuggestedBusanZones}
                  />
                ) : null}

                {selectedRegions.has("gyeonggi") ? (
                  <PlannerGyeonggiZoneChips
                    selected={gyeonggiZones}
                    suggested={suggestedGyeonggiZones}
                    isKo={isKo}
                    onToggle={toggleGyeonggiZone}
                    onClear={clearGyeonggiZones}
                    onApplySuggested={applySuggestedGyeonggiZones}
                  />
                ) : null}

                {selectedRegions.has("incheon") ? (
                  <PlannerIncheonZoneChips
                    selected={incheonZones}
                    suggested={suggestedIncheonZones}
                    isKo={isKo}
                    onToggle={toggleIncheonZone}
                    onClear={clearIncheonZones}
                    onApplySuggested={applySuggestedIncheonZones}
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
                    <Wallet className="h-5 w-5 text-[color:var(--qp-accent)]" />
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
                    className="w-full accent-[color:var(--qp-accent)]"
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
                  supplementalById={mediaCacheById}
                  campaignMediaIds={campaignMediaIds}
                  campaignMediaQuantities={campaignMediaQuantities}
                  campaignMediaPriceOptionIndex={campaignMediaPriceOptionIndex}
                  onQuantityChange={setCampaignMediaQuantity}
                  onPriceOptionChange={setCampaignMediaPriceOptionIndex}
                  onRemove={removePlannerMedia}
                  onClearAll={clearPlannerMedia}
                  isKo={isKo}
                />

                <PlannerRecommendationPanel
                  catalog={recommendationCatalog}
                  isKo={isKo}
                  regionLabel={mediaRegionLabel}
                  store={recommendationStore}
                  supplementalById={mediaCacheById}
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
                  digitalChannels={digitalChannels}
                  digitalCatalogMeta={digitalCatalogMeta}
                  mix={mixResult}
                  mixLoading={mixLoading}
                  mixError={mixError}
                  onMixRetry={refetchMix}
                  onMixContact={goToIntegratedContact}
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
              <div className="space-y-6">
                {mixError ? (
                  <IntegratedMixErrorBanner
                    error={mixError}
                    isKo={isKo}
                    onRetry={refetchMix}
                    onContact={goToIntegratedContact}
                  />
                ) : null}
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
                portfolioPricing={portfolioPricing}
                digitalResult={digitalResult}
                metrics={integratedMetrics}
                logoUrl={creativeUploadedUrl || creativeObjectUrl}
                mediaPlacements={mediaPlacements}
                appliedScenario={appliedScenario}
                scenarioVariantLabels={scenarioVariantLabels}
                recommendationContext={{
                  goal: campaignGoal,
                  regions,
                  seoulZones,
                  busanZones,
      gyeonggiZones,
      incheonZones,
      categories: categoriesArr,
                  ageKeys,
                  industryKey,
                  budgetMan: budgetNum,
                  months,
                  goalFollowUp,
                }}
              />
              </div>
            ) : null}
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
                <BtnBlock
                  variant="accent"
                  size="md"
                  onClick={goToIntegratedContact}
                  disabled={navigatingContact}
                >
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
              mix={mixResult}
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

        {wizardStep <= LAST_STEP ? (
          <StickyActionBar
            open
            layout="dock"
            variant="neon"
            compact
            aboveMobileChrome
            ariaLabel={ti("stepOf", {
              current: wizardStep,
              total: LAST_STEP,
            })}
          >
            <div className={cn(STICKY_ACTION_BAR_ROW, "mx-auto w-full max-w-3xl")}>
              <span
                className="min-w-0 flex-1 truncate tkad-type-note font-medium tabular-nums text-gray-600 dark:text-white/55"
                aria-live="polite"
              >
                {ti("stepOf", {
                  current: wizardStep,
                  total: LAST_STEP,
                })}
              </span>
              <button
                type="button"
                onClick={goPrevStep}
                disabled={wizardStep <= 1}
                className={cn(
                  STICKY_ACTION_BAR_BTN,
                  STICKY_ACTION_BAR_BTN_IDLE,
                  "disabled:opacity-40",
                )}
              >
                <ChevronLeft className="h-3 w-3 shrink-0" aria-hidden />
                {t("back")}
              </button>
              <button
                type="button"
                onClick={goNext}
                className={cn(
                  STICKY_ACTION_BAR_BTN,
                  STICKY_ACTION_BAR_BTN_PRIMARY,
                )}
              >
                {wizardStep === LAST_STEP ? (
                  <>
                    {ti("viewDashboard")}
                    <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                  </>
                ) : (
                  <>
                    {t("next")}
                    <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </StickyActionBar>
        ) : null}
      </IntegratedPlannerPageBody>
    </div>
    </HomeLandingDayNight>
  );
}
