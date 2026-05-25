"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CategoryExploreHero } from "@/components/category-explore-hero";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  GitCompare,
  Layers,
  Send,
  TrendingUp,
  Wallet,
  CalendarRange,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
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
  matchesPlannerCategory,
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
import { PredictionAccuracyBanner } from "@/components/planner/prediction-accuracy-banner";
import type { PlatformPredictionAccuracy } from "@/lib/prediction-accuracy";
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
import { PlannerRecommendationPanel } from "@/components/planner/recommendation-panel";
import {
  CompositePreview,
  DEFAULT_LOGO_PLACEMENT,
} from "@/components/planner/composite-preview";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
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
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import { selectBudgetNum, usePlannerStore } from "@/lib/planner/store";
import { canProceedFromStep } from "@/lib/planner/validation";
import {
  formatCatalogPriceFieldWon,
  formatCpmKrw,
  formatMediaPriceCompactWon,
  formatPricePeriodShortLabel,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import { useIsPro } from "@/hooks/use-is-pro";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  PlannerProGate,
  PlannerTrialBanner,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import {
  PageSubNav,
  PLANNER_SUB_NAV_ITEMS,
} from "@/components/navigation/page-sub-nav";
import type { HomeAppearance } from "@/lib/home-appearance";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";
import { useTeamPermissions } from "@/lib/use-team-permissions";

/** 밤: 메인 NeonSection 과 동일한 #05050a + 네온 뎁스(히어로 아래 본문만 밝은 페이지 배경이 비지 않도록) */
function PlannerNeonPageBody({
  appearance,
  className,
  children,
}: {
  appearance: HomeAppearance;
  className?: string;
  children: ReactNode;
}) {
  const inner = (
    <div className={cn("tkad-planner-neon", className)}>{children}</div>
  );
  if (appearance === "night") {
    return (
      <div className="relative overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#020202] dark:text-white">
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
        <div className="relative">{inner}</div>
      </div>
    );
  }
  return inner;
}

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
  predictionAccuracy: PlatformPredictionAccuracy;
};

export default function PlannerPageClient({
  catalog,
  databaseEmpty,
  predictionAccuracy,
}: Props) {
  const t = useTranslations("planner");
  const tm = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const { toast } = useToast();
  const landingAppearance = useTkadAppearance();
  const { showTrialBanner, isPro, loading: proLoading } = useIsPro();

  const priceOptionBadge = useCallback(
    (m: MediaItem): string | null => {
      const opts = m.priceOptions ?? [];
      if (opts.length === 0) return null;
      const periods = Array.from(
        new Set(opts.map((o) => normalizeMediaPricePeriod(o.period))),
      );
      const hasNonMonth = periods.some((p) => p !== "month");
      if (!hasNonMonth) return null;
      const labels = periods.map((p) => formatPricePeriodShortLabel(p, locale));
      const uniq = Array.from(new Set(labels)).join(" · ");
      return isKo ? `옵션: ${uniq}` : `Options: ${uniq}`;
    },
    [locale, isKo],
  );

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
  const creativeUploadedUrl = usePlannerStore((s) => s.creativeUploadedUrl);
  const mediaPlacements = usePlannerStore((s) => s.mediaPlacements);

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
  const setCreativeUploadedUrl = usePlannerStore(
    (s) => s.setCreativeUploadedUrl,
  );
  const applyPresetAction = usePlannerStore((s) => s.applyPreset);
  const importFromSavedPlan = usePlannerStore((s) => s.importFromSavedPlan);

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

  /** Step4 AI 추천: 엄격 필터 결과가 비어도 등록 매체가 보이도록 완화 풀 (직접 탐색은 기존 `catalog`) */
  const recommendationCatalog = useMemo(() => {
    if (filtered.length > 0) return filtered;
    if (selectedRegions.size > 0) {
      const byRegion = catalog.filter((m) => selectedRegions.has(m.region));
      if (byRegion.length > 0) return byRegion;
    }
    if (categories.size > 0) {
      const byCat = catalog.filter((m) =>
        [...categories].some((c) => matchesPlannerCategory(m, c)),
      );
      if (byCat.length > 0) return byCat;
    }
    return catalog;
  }, [filtered, catalog, selectedRegions, categories]);

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

  const compareHref = useMemo(() => {
    const ids = Array.from(campaignMediaIds).slice(0, COMPARE_MAX_ITEMS);
    const q = ids.join(",");
    return q ? `/compare?ids=${q}` : "/compare";
  }, [campaignMediaIds]);

  const applyPreset = useCallback(
    (id: "premium" | "national" | "value") => {
      applyPresetAction(id);
      toast("success", isKo ? "프리셋이 적용되었습니다." : "Preset applied.");
    },
    [applyPresetAction, toast, isKo],
  );

  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const teamPerms = useTeamPermissions();
  const router = useRouter();
  const [navigatingContact, setNavigatingContact] = useState(false);


  // PR-D: 매체 상세 ?addMedia= · 찜 목록 ?mediaIds= 로 Step 4 사전 선택
  const searchParams = useSearchParams();
  const addMediaId = searchParams.get("addMedia");
  const mediaIdsParam = searchParams.get("mediaIds");
  const loadPlanParam = searchParams.get("loadPlan");
  const handledQueryRef = useRef<string | null>(null);
  const handledLoadPlanRef = useRef<string | null>(null);

  const stripPlannerQueryKeys = useCallback((keys: string[]) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    for (const k of keys) url.searchParams.delete(k);
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    const batchKey = mediaIdsParam
      ? `mediaIds:${mediaIdsParam}`
      : addMediaId
        ? `addMedia:${addMediaId}`
        : null;
    if (!batchKey) return;
    if (handledQueryRef.current === batchKey) return;
    handledQueryRef.current = batchKey;

    if (mediaIdsParam) {
      const requested = mediaIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const valid = requested.filter((id) => catalog.some((m) => m.id === id));
      if (valid.length === 0) {
        toast(
          "error",
          isKo
            ? "선택한 매체를 찾을 수 없습니다."
            : "Selected media not found.",
        );
        stripPlannerQueryKeys(["mediaIds"]);
        return;
      }
      setCampaignMediaIds(valid);
      setWizardStep(4);
      toast(
        "success",
        isKo
          ? `찜한 매체 ${valid.length}개로 플래너를 시작합니다.`
          : `Starting planner with ${valid.length} saved media.`,
      );
      stripPlannerQueryKeys(["mediaIds", "addMedia"]);
      return;
    }

    if (!addMediaId) return;
    const exists = catalog.some((m) => m.id === addMediaId);
    if (!exists) {
      toast(
        "error",
        isKo
          ? "선택한 매체를 찾을 수 없습니다."
          : "Selected media not found.",
      );
      stripPlannerQueryKeys(["addMedia"]);
      return;
    }
    setCampaignMediaIds((prev) =>
      prev.includes(addMediaId) ? prev : [...prev, addMediaId],
    );
    setWizardStep(4);
    toast(
      "success",
      isKo
        ? "매체가 캠페인에 추가되었습니다."
        : "Media added to your campaign.",
    );
    stripPlannerQueryKeys(["addMedia"]);
  }, [
    addMediaId,
    mediaIdsParam,
    catalog,
    setCampaignMediaIds,
    setWizardStep,
    toast,
    isKo,
    stripPlannerQueryKeys,
  ]);

  useEffect(() => {
    if (!loadPlanParam) return;
    if (handledLoadPlanRef.current === loadPlanParam) return;
    handledLoadPlanRef.current = loadPlanParam;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/planner/shared/${loadPlanParam}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          toast(
            "error",
            isKo
              ? "플랜을 불러오지 못했습니다. 만료되었을 수 있습니다."
              : "Could not load this plan. It may have expired.",
          );
          stripPlannerQueryKeys(["loadPlan"]);
          return;
        }
        const data = (await res.json()) as { planJson?: SavedPlannerPlanJson };
        if (cancelled || !data.planJson) return;
        importFromSavedPlan(data.planJson);
        setSavedPlanId(loadPlanParam);
        const mediaCount = data.planJson.campaignMediaIds?.length ?? 0;
        setWizardStep(mediaCount > 0 ? 4 : 2);
        toast(
          "success",
          isKo ? "저장된 플랜을 불러왔습니다." : "Saved plan loaded.",
        );
        stripPlannerQueryKeys(["loadPlan"]);
      } catch {
        if (!cancelled) {
          toast(
            "error",
            isKo ? "플랜 불러오기에 실패했습니다." : "Failed to load plan.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    loadPlanParam,
    importFromSavedPlan,
    setWizardStep,
    toast,
    isKo,
    stripPlannerQueryKeys,
  ]);

  /**
   * 현재 플래너 입력을 DB 에 저장하고 공유 가능한 URL 을 반환.
   * 기존 localStorage persist 는 유지 — DB 저장은 "공유/이메일 발송" 시점에만.
   */
  const persistPlan = useCallback(
    async (saveMode: "share" | "draft" = "share"): Promise<string | null> => {
      const state = usePlannerStore.getState();
      const planJson = {
        campaignGoal: state.campaignGoal,
        regions: Array.from(state.regions),
        categories: Array.from(state.categories),
        budget: state.budget,
        months: state.months,
        ageKey: state.ageKey,
        industryKey: state.industryKey,
        campaignMediaIds: Array.from(state.campaignMediaIds),
        creativeUploadedUrl: state.creativeUploadedUrl,
        mediaPlacements: state.mediaPlacements,
      };

      let userEmail: string | undefined;
      try {
        const sessionRes = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const sessionData = await sessionRes.json();
        if (sessionData?.ok && sessionData.data?.email) {
          userEmail = sessionData.data.email as string;
        }
      } catch {
        /* ignore */
      }

      const res = await fetch("/api/planner/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planJson,
          saveMode,
          userEmail,
          shareWithTeam: shareWithTeam && saveMode === "share",
          planId: savedPlanId ?? undefined,
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const errBody = (await res.json()) as { error?: string; detail?: string };
          detail = errBody?.detail || errBody?.error || "";
        } catch {
          try {
            detail = await res.text();
          } catch {
            /* ignore */
          }
        }
        console.error("[planner.save] failed", {
          status: res.status,
          detail,
        });
        return null;
      }

      const data = (await res.json()) as { id?: string; expiresAt?: string };
      if (!data.id) {
        console.error("[planner.save] missing id in response", data);
        return null;
      }
      return data.id;
    },
    [savedPlanId, shareWithTeam],
  );

  const goToContactQuote = useCallback(async () => {
    if (navigatingContact || saving) return;
    if (teamPerms.loaded && !teamPerms.canContactOrPay) {
      toast(
        "error",
        isKo
          ? "뷰어 권한은 견적 요청을 할 수 없습니다."
          : "Viewers cannot request quotes.",
      );
      return;
    }
    setNavigatingContact(true);
    try {
      let planId = savedPlanId;
      if (!planId) {
        setSaving(true);
        planId = await persistPlan("share");
        if (planId) {
          setSavedPlanId(planId);
          const origin =
            typeof window !== "undefined" ? window.location.origin : "";
          const url = `${origin}/${locale}/planner/shared/${planId}`;
          setShareUrl(url);
        }
        setSaving(false);
      }
      if (!planId) {
        toast(
          "error",
          isKo ? "플랜 저장에 실패했습니다." : "Could not save your plan.",
        );
        return;
      }
      router.push(`/contact?plan=${planId}`);
    } finally {
      setNavigatingContact(false);
    }
  }, [
    isKo,
    locale,
    navigatingContact,
    persistPlan,
    router,
    savedPlanId,
    saving,
    toast,
    teamPerms.loaded,
    teamPerms.canContactOrPay,
  ]);

  const savePlan = useCallback(async (saveMode: "share" | "draft" = "share") => {
    if (saving) return;
    setSaving(true);
    try {
      const dataId = await persistPlan(saveMode);
      if (!dataId) {
        throw new Error("save failed");
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/${locale}/planner/shared/${dataId}`;
      setShareUrl(url);
      setSavedPlanId(dataId);
      // 링크를 즉시 클립보드에도 복사
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url).catch(() => {});
      }
      toast(
        "success",
        saveMode === "draft" ? t("savedToastDraft24h") : t("savedToast"),
      );
    } catch (e) {
      console.error("[planner.save] error", e);
      toast(
        "error",
        isKo ? "저장에 실패했습니다." : "Could not save plan.",
      );
    } finally {
      setSaving(false);
    }
  }, [persistPlan, saving, toast, t, isKo, locale]);

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
      <HomeLandingDayNight>
        <div className="tkad-landing-neon">
          <CategoryExploreHero
          code="// 05 · PLANNER"
          showBeta
          headlineBefore={isKo ? "예산에 맞는 " : "Media plans for "}
          headlineGradient={isKo ? "미디어 플랜" : "your budget"}
          subtitle={t("subtitle")}
        />

          <PlannerNeonPageBody
            appearance={landingAppearance}
            className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6"
          >
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-foreground/70">
              [ EMPTY CATALOG ]
            </p>
            <p className="mt-3 text-lg font-bold tracking-tight text-foreground">
              {t("preparingMedia")}
            </p>
            <p className="mt-2 text-[12px] tracking-tight text-muted-foreground">
              {t("preparingMediaDesc")}
            </p>
            <div className="mt-8 inline-block">
              <BtnBlock href="/media" variant="accent" size="md">
                {t("browseMedia")}
              </BtnBlock>
            </div>
          </PlannerNeonPageBody>
        </div>
      </HomeLandingDayNight>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon">
        <CategoryExploreHero
          code="// 05 · PLANNER"
          showBeta
          headlineBefore={isKo ? "예산에 맞는 " : "Media plans for "}
          headlineGradient={isKo ? "미디어 플랜" : "your budget"}
          subtitle={t("subtitle")}
        />

        <PageSubNav
          items={PLANNER_SUB_NAV_ITEMS}
          locale={locale}
          className="mx-auto max-w-7xl px-4 pb-4 sm:px-6"
          data-screenshot="planner-sub-nav"
        />

        <PlannerNeonPageBody
          appearance={landingAppearance}
          className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12"
        >
        {wizardStep <= PLANNER_LAST_INPUT_STEP ? (
          <PlannerStepper
            currentStep={wizardStep}
            stepOfLabel={t("stepOf", {
              current: wizardStep,
              total: PLANNER_LAST_INPUT_STEP,
            })}
            onStepClick={(s) => setWizardStep(s)}
          />
        ) : null}

        {wizardStep <= PLANNER_LAST_INPUT_STEP ? (
          <div
            className={cn(
              "mx-auto space-y-8",
              // 매체 선택·소재 업로드·보고서 단계는 넓은 캔버스 필요
              wizardStep === 4 || wizardStep === 5 || wizardStep === 6
                ? "max-w-7xl"
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
              <>
                {showTrialBanner ? <PlannerTrialBanner isKo={isKo} /> : null}
                <PlannerCampaignStep1
                  campaignGoal={campaignGoal}
                  goals={GOALS}
                  onSelectGoal={setCampaignGoal}
                />
              </>
            ) : null}

            {/* Step 2 — 타깃 · 지역 */}
            {wizardStep === 2 ? (
              <div className="space-y-6">
                <div className="space-y-2 text-center sm:text-left">
                  <PlannerNeonLabel>Step 2 / Target + Region</PlannerNeonLabel>
                  <h2 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
                    {t("stepRegionTitle")}
                  </h2>
                  <p className={plannerNeon.subtext}>{t("stepRegionDesc")}</p>
                </div>

                <PlannerNeonCard>
                  <div className={plannerNeon.cardHeader}>
                    <PlannerNeonLabel>Category</PlannerNeonLabel>
                    <h3
                      className={cn(
                        "mt-2 flex items-center gap-2 text-lg",
                        plannerNeon.headline,
                      )}
                    >
                      <Layers className="h-5 w-5 text-violet-400" />
                      {t("category")}
                    </h3>
                    <p className={cn("mt-1", plannerNeon.subtext)}>
                      {t("mediaMixHint")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 p-5 sm:p-6">
                    {CATEGORIES.map(({ key, labelKey }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCategory(key)}
                        className={cn(
                          plannerNeon.selectChip,
                          "touch-manipulation",
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

                <PlannerNeonCard>
                  <div className={plannerNeon.cardHeader}>
                    <PlannerNeonLabel>{t("packagesTitle")}</PlannerNeonLabel>
                  </div>
                  <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6">
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
                        className={cn(
                          plannerNeon.selectChip,
                          "p-4 text-left",
                          plannerNeon.selectChipIdle,
                          "hover:border-violet-300/40",
                        )}
                      >
                        <p className={cn("font-bold", plannerNeon.headline)}>
                          {t(titleKey)}
                        </p>
                        <p className={cn("mt-2 text-xs leading-relaxed", plannerNeon.subtext)}>
                          {t(descKey)}
                        </p>
                      </button>
                    ))}
                  </div>
                </PlannerNeonCard>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <PlannerNeonLabel className="mb-3 block">
                      {t("ageLabel")}
                    </PlannerNeonLabel>
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
                  </div>
                  <div>
                    <PlannerNeonLabel className="mb-3 block">
                      {t("industryLabel")}
                    </PlannerNeonLabel>
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
              </div>
            ) : null}

            {/* Step 3 — 예산 · 기간 */}
            {wizardStep === 3 ? (
              <PlannerNeonCard>
                <div className={plannerNeon.cardHeader}>
                  <PlannerNeonLabel>Step 3 / Budget + Period</PlannerNeonLabel>
                  <h3
                    className={cn(
                      "mt-2 flex items-center gap-2 text-lg",
                      plannerNeon.headline,
                    )}
                  >
                    <Wallet className="h-5 w-5 text-violet-400" />
                    {t("stepBudgetTitle")}
                  </h3>
                  <p className={cn("mt-1", plannerNeon.subtext)}>
                    {t("stepBudgetDesc")}
                  </p>
                </div>
                <div className="space-y-6 p-5 sm:p-6">
                  <div>
                    <div
                      className={cn(
                        "mb-3 flex justify-between text-xs uppercase tracking-widest",
                        plannerNeon.kpiLabel,
                      )}
                    >
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
                      className="h-2 w-full cursor-pointer appearance-none rounded-full dark:bg-white/10 bg-gray-200"
                      style={{ accentColor: "#8B5CF6" }}
                      aria-label={t("budget")}
                    />
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <div className="min-w-[8rem] flex-1">
                        <PlannerNeonLabel>{t("budget")}</PlannerNeonLabel>
                        <input
                          inputMode="numeric"
                          value={budget}
                          onChange={(e) =>
                            setBudget(e.target.value.replace(/[^\d]/g, ""))
                          }
                          className={cn(
                            "mt-1 h-11 w-full rounded-xl border px-3 font-bold tabular-nums",
                            "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                            "dark:text-white text-gray-900 focus:border-violet-400/60 focus:outline-none",
                          )}
                        />
                      </div>
                      <p className={cn("pb-1 text-sm", plannerNeon.subtext)}>
                        {t("budgetPerMonthSummary", {
                          amount: Math.round(budgetNum / Math.max(months, 1)),
                        })}
                      </p>
                    </div>
                    {blurbParts ? (
                      <p
                        className={cn(
                          "mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed",
                          "dark:border-violet-500/30 border-violet-200 dark:bg-violet-500/10 bg-violet-50",
                          plannerNeon.subtext,
                        )}
                      >
                        {t("budgetBlurb", {
                          name: blurbParts.sampleName.slice(0, 32),
                          price: blurbParts.samplePrice,
                          slots: blurbParts.slotsAtMonth,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <PlannerNeonLabel className="mb-3 flex items-center gap-2">
                      <CalendarRange className="h-4 w-4" />
                      {t("period")}
                    </PlannerNeonLabel>
                    <div className="flex flex-wrap gap-2">
                      {PLANNER_PERIOD_OPTIONS.map((opt) => {
                        const selected = Math.abs(months - opt.months) < 0.04;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setMonths(opt.months)}
                            className={cn(
                              plannerNeon.selectChip,
                              selected
                                ? plannerNeon.selectChipActive
                                : plannerNeon.selectChipIdle,
                            )}
                          >
                            {t(opt.labelKey)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </PlannerNeonCard>
            ) : null}

            {/* Step 4 — 매체 선택 (AI 추천 + 직접 탐색) */}
            {wizardStep === 4 ? (
              <div className="space-y-6">
                <div className="space-y-2 text-center sm:text-left">
                  <PlannerNeonLabel>Step 4 / Media Selection</PlannerNeonLabel>
                  <h2 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
                    {t("stepMediaTitle")}
                  </h2>
                  <p className={plannerNeon.subtext}>{t("stepMediaDesc")}</p>
                </div>

                <PlannerRecommendationPanel
                  catalog={recommendationCatalog}
                  isKo={isKo}
                  regionLabel={mediaRegionLabel}
                />

                <div className="space-y-2 border-t dark:border-white/10 border-gray-100 pt-6">
                  <PlannerNeonLabel>Manual Browse</PlannerNeonLabel>
                  <h3 className={cn("text-base", plannerNeon.headline)}>
                    {t("recommendBrowseTitle")}
                  </h3>
                  <p className={plannerNeon.subtext}>{t("recommendBrowseDesc")}</p>
                </div>
                <PlannerMediaSelector
                  catalog={catalog}
                  campaignMediaIds={campaignMediaIds}
                  setCampaignMediaIds={setCampaignMediaIds}
                  isKo={isKo}
                  regionLabel={mediaRegionLabel}
                />
              </div>
            ) : null}

            {/* Step 5 — 로고 업로드 + 합성 미리보기 */}
            {wizardStep === 5 ? (
              <PlannerSimulationStep3
                selectedMedia={selectedMediaForSimulation}
                creativeObjectUrl={creativeObjectUrl}
                setCreativeObjectUrl={setCreativeObjectUrl}
                creativeUploadedUrl={creativeUploadedUrl}
                setCreativeUploadedUrl={setCreativeUploadedUrl}
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
                matchedCount={filtered.length}
                monthCompare={monthCompare}
                cpmBars={cpmBars}
                metrics={metrics}
                reachCorePct={reachSplit.corePct}
                reachExtendedPct={reachSplit.extendedPct}
                logoUrl={creativeUploadedUrl || creativeObjectUrl}
                mediaPlacements={mediaPlacements}
              />
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t dark:border-white/10 border-gray-100 pt-6 sm:flex-row sm:justify-between">
              <BtnBlock
                variant="secondary"
                size="md"
                onClick={goBack}
                disabled={wizardStep <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("back")}
              </BtnBlock>
              <BtnBlock variant="accent" size="md" onClick={goNext}>
                {wizardStep === 6 ? (
                  <>
                    {t("viewEffectDashboard")}
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
              <BtnBlock
                variant="secondary"
                size="md"
                onClick={() => setWizardStep(2)}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("editInputs")}
              </BtnBlock>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {teamPerms.hasTeam && teamPerms.canUsePlanner ? (
                  <label className="flex w-full items-center gap-2 rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 px-3 py-2 text-sm dark:text-white text-gray-700 sm:w-auto">
                    <input
                      type="checkbox"
                      checked={shareWithTeam}
                      onChange={(e) => setShareWithTeam(e.target.checked)}
                      className="h-4 w-4 rounded border-white/30"
                    />
                    <span>
                      {isKo
                        ? `${teamPerms.teamName ?? "팀"}과 공유`
                        : `Share with ${teamPerms.teamName ?? "team"}`}
                    </span>
                  </label>
                ) : null}
                <BtnBlock
                  variant="primary"
                  size="md"
                  onClick={() => void savePlan("share")}
                  disabled={saving || (teamPerms.loaded && !teamPerms.canUsePlanner)}
                >
                  <Download className="h-4 w-4" />
                  {saving ? t("savingInProgress") : t("ctaSave")}
                </BtnBlock>
                <BtnBlock
                  variant="secondary"
                  size="md"
                  onClick={() => void savePlan("draft")}
                  disabled={saving || (teamPerms.loaded && !teamPerms.canUsePlanner)}
                >
                  <Download className="h-4 w-4" />
                  {t("ctaSaveDraft24h")}
                </BtnBlock>
                <BtnBlock href={compareHref} variant="secondary" size="md">
                  <GitCompare className="h-4 w-4" />
                  {t("ctaCompareSelection")}
                </BtnBlock>
                <BtnBlock
                  href="/proposal?fromPlanner=1"
                  variant="secondary"
                  size="md"
                  className="w-full border-emerald-400/35 bg-emerald-500/10 sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  {t("ctaCreateProposal")}
                </BtnBlock>
                <div className="flex w-full flex-col sm:w-auto">
                  <BtnBlock
                    variant="accent"
                    size="lg"
                    className="min-h-14 w-full !dark:text-white text-gray-900 bg-gradient-to-r from-violet-500 to-cyan-400 text-base font-black shadow-lg shadow-violet-500/30"
                    onClick={() => void goToContactQuote()}
                    disabled={
                      saving ||
                      navigatingContact ||
                      (teamPerms.loaded && !teamPerms.canContactOrPay)
                    }
                  >
                    <Send className="h-5 w-5" />
                    {navigatingContact
                      ? t("savingInProgress")
                      : t("ctaQuoteWithPlan")}
                  </BtnBlock>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {t("quoteTrustLine")}
                  </p>
                </div>
              </div>
            </div>

            {shareUrl ? (
              <div
                className={cn(
                  plannerNeon.card,
                  "border-violet-400/30 px-4 py-3",
                )}
                role="status"
              >
                <PlannerNeonLabel>{t("shareBannerTitle")}</PlannerNeonLabel>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl border px-3 py-1.5 text-xs",
                      "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                      "dark:text-white text-gray-900 focus:border-violet-400/60 focus:outline-none",
                    )}
                  />
                  <BtnBlock
                    variant="accent"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        toast("success", t("shareCopied"));
                      } catch {
                        toast(
                          "error",
                          isKo
                            ? "복사에 실패했습니다."
                            : "Copy failed.",
                        );
                      }
                    }}
                  >
                    {t("shareCopy")}
                  </BtnBlock>
                </div>
                <p className={cn("mt-2 text-xs", plannerNeon.subtext)}>
                  {t("shareBannerExpiry")}
                </p>
              </div>
            ) : null}

            {filtered.length === 0 ? (
              <div
                className={cn(
                  plannerNeon.card,
                  "py-12 text-center",
                )}
              >
                <p className={plannerNeon.subtext}>{t("emptyFilter")}</p>
                <div className="mt-6 flex justify-center">
                  <BtnBlock
                    variant="primary"
                    size="md"
                    onClick={() => setWizardStep(2)}
                  >
                    {t("editInputs")}
                  </BtnBlock>
                </div>
              </div>
            ) : budgetNum < PLANNER_BUDGET_MIN ? (
              <div
                className={cn(
                  plannerNeon.card,
                  "border-violet-400/30 py-10 text-center",
                )}
              >
                <PlannerNeonLabel>Need Budget</PlannerNeonLabel>
                <p className={cn("mt-3 font-bold", plannerNeon.headline)}>
                  {t("needBudget")}
                </p>
              </div>
            ) : metrics ? (
              <>
                <PredictionAccuracyBanner
                  accuracy={predictionAccuracy}
                  isKo={isKo}
                />

                <div className="tkad-glass-surface relative flex flex-col gap-2 overflow-hidden rounded-[22px] px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border dark:border-white/14 border-gray-200 dark:bg-white/10 bg-gray-100 px-2.5 py-1 font-display text-[10px] font-black uppercase tracking-[0.18em] text-foreground backdrop-blur">
                      {t("estimatedModelBadge")}
                    </span>
                    <span className="min-w-0 text-left text-xs leading-relaxed sm:text-sm">
                      {t("estimatedModelHint")}
                    </span>
                  </div>
                </div>

                <p className={cn(plannerNeon.card, "rounded-[22px] px-4 py-3 text-sm")}>
                  <PlannerNeonLabel className="mr-2 inline">
                    {t("targetSummaryLabel")}
                  </PlannerNeonLabel>
                  {(() => {
                    const g = GOALS.find((x) => x.key === campaignGoal);
                    return g ? t(g.titleKey) : "—";
                  })()}
                  {" · "}
                  {t("ageLabel")}: {t(ageKey)} · {t("industryLabel")}:{" "}
                  {t(industryKey)}
                </p>

                {/* 공개: 총 예상 노출수만 */}
                {metrics ? (
                  <div className={cn(plannerNeon.kpiCard, "max-w-sm")}>
                    <p className={plannerNeon.kpiLabel}>{t("kpiImpressions")}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-cyan-400">
                      {metrics.estimatedTotalImpressions.toLocaleString()}
                    </p>
                    <p className={cn("mt-1 text-xs", plannerNeon.subtext)}>
                      {t("kpiImpressionsHint")}
                    </p>
                  </div>
                ) : null}

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b dark:border-white/10 border-gray-100 p-5">
                    <PlannerNeonLabel>Portfolio</PlannerNeonLabel>
                    <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
                      {t("comboTitle")}
                    </h3>
                    <p className={cn("mt-1 text-sm", plannerNeon.subtext)}>
                      {manualIntersectedPortfolio.length > 0
                        ? t("comboHintManual")
                        : t("comboHint")}
                    </p>
                  </div>
                  <div className="relative grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolio.map((m) => (
                      <Link
                        key={m.id}
                        href={mediaItemDetailPath(m)}
                        className="group tkad-glass-surface flex flex-col gap-2 rounded-[22px] p-3 transition-all hover:-translate-y-0.5 hover:dark:bg-white/10 bg-gray-100"
                      >
                        <CompositePreview
                          mediaImageUrl={getPrimaryMediaImageUrl(m)}
                          mediaName={isKo ? m.name : m.nameEn || m.name}
                          logoUrl={
                            creativeUploadedUrl || creativeObjectUrl
                          }
                          placement={
                            mediaPlacements[m.id] ?? DEFAULT_LOGO_PLACEMENT
                          }
                          compact
                          missingLabel={t("mediaPhotoMissing")}
                        />
                        <div>
                          <p className="line-clamp-2 text-sm font-bold tracking-tight text-foreground">
                            {isKo ? m.name : (m.nameEn || m.name) || m.name}
                          </p>
                          <p className={cn("mt-1 text-xs uppercase tracking-widest", plannerNeon.subtext)}>
                            {tm(`regions.${m.region}`)} ·{" "}
                            {isKo
                              ? m.location.slice(0, 40)
                              : (m.locationEn || m.location).slice(0, 40)}
                          </p>
                          <p className="mt-2 text-sm font-bold tabular-nums text-violet-400">
                            {formatCatalogPriceFieldWon(m.price, isKo ? "ko" : "en")}
                            <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                              /{isKo ? "월" : "mo"}
                            </span>
                          </p>
                          {(() => {
                            const badge = priceOptionBadge(m);
                            if (!badge) return null;
                            return (
                              <p className={cn("mt-1 text-[10px] font-medium", plannerNeon.kpiLabel)}>
                                {badge}
                              </p>
                            );
                          })()}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {!proLoading ? (
                  <PlannerProGate
                    isPro={isPro}
                    isKo={isKo}
                    minHeightClass="min-h-[20rem]"
                    className="space-y-3"
                  >
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                    <div className="relative border-b dark:border-white/10 border-gray-100 p-5">
                      <PlannerNeonLabel>{t("results")}</PlannerNeonLabel>
                    </div>
                    <div className="relative grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                      <div className={plannerNeon.kpiCard}>
                        <p className={plannerNeon.kpiLabel}>{t("matchedMedia")}</p>
                        <p className={cn("mt-2 text-2xl font-bold tabular-nums", plannerNeon.kpiValue)}>
                          {filtered.length}
                          <span className={cn("ml-1 text-base", plannerNeon.subtext)}>
                            {t("countUnit")}
                          </span>
                        </p>
                      </div>
                      <div className={plannerNeon.kpiCard}>
                        <p className={plannerNeon.kpiLabel}>{t("avgMonthlySlot")}</p>
                        <p className={cn("mt-2 text-2xl font-bold tabular-nums", plannerNeon.kpiValue)}>
                          {formatCatalogPriceFieldWon(
                            Math.round(metrics.avgMonthlyPrice),
                            isKo ? "ko" : "en",
                          )}
                          <span className={cn("ml-1 text-sm", plannerNeon.subtext)}>
                            /{isKo ? "월" : "mo"}
                          </span>
                        </p>
                      </div>
                      <div className={cn(plannerNeon.kpiCard, "sm:col-span-2")}>
                        <p className={plannerNeon.kpiLabel}>{t("estMonthlyImp")}</p>
                        <p className={cn("mt-2 text-xl font-bold tabular-nums", plannerNeon.kpiValue)}>
                          {metrics.estimatedMonthlyImpressions.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="tkad-glass-surface relative overflow-hidden rounded-[26px] p-6">
                    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                    <PlannerReachDonutChart
                      corePct={reachSplit.corePct}
                      extendedPct={reachSplit.extendedPct}
                      title={t("chartReachTitle")}
                      coreLabel={t("reachCore")}
                      extendedLabel={t("reachExtended")}
                    />
                  </div>
                </div>

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b dark:border-white/10 border-gray-200 p-5">
                    <PlannerNeonLabel className="p-5 pb-0">
                      {t("chartDailyBarTitle")}
                    </PlannerNeonLabel>
                  </div>
                  <div className="relative p-5">
                    <PlannerDailyReachBarChart
                      data={dailyBars}
                      title={t("chartDailyBarTitle")}
                      valueLabel={t("chartDailyBarAxis")}
                    />
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="tkad-glass-surface relative overflow-hidden rounded-[26px] p-6">
                    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                    <PlannerBudgetPieChart
                      data={pieSlices}
                      title={t("chartBudgetPieTitle")}
                      unitLabel={t("chartBudgetPieUnit")}
                    />
                  </div>
                  <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                    <div className="relative border-b dark:border-white/10 border-gray-200 p-5">
                      <PlannerNeonLabel className="p-5 pb-0">
                        {t("chartCpmTitle")}
                      </PlannerNeonLabel>
                    </div>
                    <div className="relative p-5">
                      <PlannerCpmCompareChart
                        data={cpmBars}
                        title={t("chartCpmTitle")}
                        unitLabel={t("chartCpmUnit")}
                      />
                    </div>
                  </div>
                </div>

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b dark:border-white/10 border-gray-200 p-5">
                    <PlannerNeonLabel className="p-5 pb-0">
                      {t("chartMonthCompareTitle")}
                    </PlannerNeonLabel>
                  </div>
                  <div className="relative p-5">
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
                  </div>
                </div>

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b dark:border-white/10 border-gray-200 p-5">
                    <PlannerNeonLabel className="p-5 pb-0">ROI</PlannerNeonLabel>
                    <h3 className={cn("mt-2 flex items-center gap-2 px-5 text-lg", plannerNeon.headline)}>
                      <TrendingUp className="h-5 w-5 text-violet-400" />
                      {t("roiTitle")}
                    </h3>
                  </div>
                  <div className="relative space-y-4 p-5">
                    {(
                      [
                        ["roiConservative", metrics.roiConservative],
                        ["roiExpected", metrics.roiExpected],
                        ["roiOptimistic", metrics.roiOptimistic],
                      ] as const
                    ).map(([labelKey, val]) => (
                      <div key={labelKey}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground">
                            {t(labelKey)}
                          </span>
                          <span className="font-display font-bold tabular-nums text-primary">
                            {val}
                            {t("roiUnit")}
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full border dark:border-white/10 border-gray-200 dark:bg-black bg-white dark:bg-white/10 bg-gray-100">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (val / roiMax) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b dark:border-white/10 border-gray-200 p-5">
                    <PlannerNeonLabel className="p-5 pb-0">
                      {t("chartImpLineTitle")}
                    </PlannerNeonLabel>
                    <p className={cn("mt-1 px-5 text-sm", plannerNeon.subtext)}>
                      {t("chartImpTitle")}
                    </p>
                  </div>
                  <div className="relative p-5">
                    <PlannerImpressionsLineChart
                      data={metrics.cumulativeByMonth}
                      isKo={isKo}
                      title={t("chartImpLineTitle")}
                    />
                  </div>
                </div>

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b dark:border-white/10 border-gray-200 p-5">
                    <PlannerNeonLabel className="p-5 pb-0">
                      {t("chartRoiLineTitle")}
                    </PlannerNeonLabel>
                    <p className={cn("mt-1 px-5 text-sm", plannerNeon.subtext)}>
                      {t("chartRoiLineHint")}
                    </p>
                  </div>
                  <div className="relative p-5">
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
                  </div>
                </div>

                  </PlannerProGate>
                ) : null}

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px] p-6 sm:p-8">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] tkad-neon-grid" />
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.14),transparent_58%),radial-gradient(circle_at_55%_110%,rgba(236,72,153,0.12),transparent_60%)]" />
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl space-y-2">
                      <PlannerNeonLabel>Next Step</PlannerNeonLabel>
                      <h3 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
                        {t("ctaBannerTitle")}
                      </h3>
                      <p className={plannerNeon.subtext}>
                        {t("ctaBannerDesc")}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[280px]">
                      <div>
                        <BtnBlock
                          variant="accent"
                          size="lg"
                          className="min-h-14 w-full !dark:text-white text-gray-900 bg-gradient-to-r from-violet-500 to-cyan-400 text-base font-black shadow-lg shadow-violet-500/30"
                          onClick={() => void goToContactQuote()}
                          disabled={saving || navigatingContact}
                        >
                          <Send className="h-5 w-5" />
                          {navigatingContact
                            ? t("savingInProgress")
                            : t("ctaQuoteWithPlan")}
                          <ArrowRight className="h-5 w-5" />
                        </BtnBlock>
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          {t("quoteTrustLine")}
                        </p>
                      </div>
                      <BtnBlock
                        href="/proposal?fromPlanner=1"
                        variant="secondary"
                        size="lg"
                        className="w-full border-emerald-400/35 bg-emerald-500/10"
                      >
                        <Sparkles className="h-4 w-4 text-emerald-400" />
                        {t("ctaCreateProposal")}
                      </BtnBlock>
                      <p className="-mt-1 text-center text-xs text-muted-foreground">
                        {t("ctaCreateProposalHint")}
                      </p>
                      <BtnBlock
                        href="/contact"
                        variant="secondary"
                        size="lg"
                        className="w-full"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("ctaContact")}
                      </BtnBlock>
                    </div>
                  </div>
                </div>

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
                  matchedCount={filtered.length}
                  monthCompare={monthCompare}
                  cpmBars={cpmBars}
                  metrics={metrics}
                  reachCorePct={reachSplit.corePct}
                  reachExtendedPct={reachSplit.extendedPct}
                  logoUrl={creativeUploadedUrl || creativeObjectUrl}
                  mediaPlacements={mediaPlacements}
                />
              </>
            ) : null}

            <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
              {t("disclaimer")}
            </p>
          </div>
        )}
        </PlannerNeonPageBody>
      </div>
    </HomeLandingDayNight>
  );
}
