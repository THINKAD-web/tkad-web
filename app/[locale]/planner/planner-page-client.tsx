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
import { ExitSurveyBanner } from "@/components/exit-survey-banner";
import { PageHero } from "@/components/layout/page-hero";
import { SubTabs } from "@/components/layout/sub-tabs";
import { PLANNING_TABS } from "@/lib/navigation/sub-page-tabs";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  GitCompare,
  Layers,
  Send,
  Wallet,
  CalendarRange,
  Sparkles,
  FileText,
} from "lucide-react";
import { useCartCompareMax } from "@/hooks/use-cart-compare-max";
import type { MediaItem } from "@/lib/media-data";
import {
  filterPlannerMediaMulti,
  countPlannerMediaByRegion,
  computePlannerMetrics,
  computeBudgetBlurbParts,
  estimateCpmByCategory,
  reachSplitForGoal,
  comparePlansByDuration,
  resolvePlannerPortfolio,
  orderPlannerSelectedMedia,
  computePlannerPortfolioBudgetStatus,
  PLANNER_AUTO_PORTFOLIO_MAX_ITEMS,
  plannerBlendCpmKrw,
} from "@/lib/planner-logic";
import { buildPlannerRecommendationCatalog } from "@/lib/planner/recommendation-catalog";
import { PLANNER_PERIOD_OPTIONS } from "@/lib/planner-period";
import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";
import { PlannerRegionMap } from "@/components/planner-region-map";
import PlannerCampaignStep1 from "@/components/planner-campaign-step1";
import { MediaSearchPage } from "@/components/media/media-search-page";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";
import PlannerTips from "@/components/planner-tips";
import PlannerSimulationStep3 from "@/components/planner-simulation-step3";
import PlannerReportStep from "@/components/planner-report-step";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { PlannerStepper } from "@/components/planner/stepper";
import { PlannerRecommendationPanel } from "@/components/planner/recommendation-panel";
import { PlannerSelectedMediaBar } from "@/components/planner/planner-selected-media-bar";
import { PlannerPortfolioNotice } from "@/components/planner/planner-portfolio-notice";
import { savePlanTransferData } from "@/lib/planner-contact-transfer";
import { getPlanCart } from "@/lib/plan-cart";
import { PlannerReportPremiumBlock } from "@/components/planner/planner-report-premium-block";
import { PlannerEffectSimulationPanel } from "@/components/planner-effect-simulation-panel";
import {
  CompositePreview,
  DEFAULT_LOGO_PLACEMENT,
} from "@/components/planner/composite-preview";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import type { PlatformPredictionAccuracy } from "@/lib/prediction-accuracy";
import {
  PLANNER_AGE_KEYS,
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  PLANNER_INDUSTRY_KEYS,
  PLANNER_LAST_INPUT_STEP,
  PLANNER_RESULT_STEP,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerMapRegion,
} from "@/lib/planner/types";
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import { selectBudgetNum, usePlannerStore } from "@/lib/planner/store";
import { canProceedFromStep } from "@/lib/planner/validation";
import { resolveWizardStepAfterPlanCartImport } from "@/lib/planner/plan-cart-import";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
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
  PlannerProTeaserStats,
  PlannerTrialBanner,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { PlannerReportInfoCard } from "@/components/planner/planner-report-info-card";
import { PlannerReportFreeSummary } from "@/components/planner/planner-report-free-summary";
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

import { PLANNER_CAMPAIGN_GOAL_DEFS } from "@/lib/planner/campaign-goal-defs";

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
  const mediaSelectionExplicit = usePlannerStore(
    (s) => s.mediaSelectionExplicit,
  );
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
  const importFromPlanCart = usePlannerStore((s) => s.importFromPlanCart);

  const plannerCatalogItems = useMemo(
    () => catalog.map((m) => mapMediaItemToHomeCatalog(m)),
    [catalog],
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
  const recommendationCatalog = useMemo(
    () =>
      buildPlannerRecommendationCatalog(
        catalog,
        filtered,
        selectedRegions,
        categories,
      ),
    [filtered, catalog, selectedRegions, categories],
  );

  const selectedMediaForSimulation = useMemo(
    () =>
      orderPlannerSelectedMedia(
        catalog,
        campaignMediaIds,
        mediaCacheById,
      ),
    [campaignMediaIds, catalog, mediaCacheById],
  );

  const metrics = useMemo(() => {
    if (filtered.length === 0 || budgetNum < PLANNER_BUDGET_MIN) return null;
    return computePlannerMetrics(filtered, budgetNum, months, {
      campaignGoal,
    });
  }, [filtered, budgetNum, months, campaignGoal]);

  const portfolio = useMemo(
    () =>
      resolvePlannerPortfolio({
        campaignMediaIds,
        selectedMediaOrdered: selectedMediaForSimulation,
        filtered,
        budgetMan: budgetNum,
        months,
        mediaSelectionExplicit,
      }),
    [
      filtered,
      budgetNum,
      months,
      campaignMediaIds,
      selectedMediaForSimulation,
      mediaSelectionExplicit,
    ],
  );

  const portfolioBudgetStatus = useMemo(
    () => computePlannerPortfolioBudgetStatus(portfolio, budgetNum, months),
    [portfolio, budgetNum, months],
  );

  const isAutoPortfolio = campaignMediaIds.length === 0;
  const unresolvedMediaCount = Math.max(
    0,
    campaignMediaIds.length - selectedMediaForSimulation.length,
  );

  const blurbParts = useMemo(
    () => computeBudgetBlurbParts(filtered, budgetNum, months),
    [filtered, budgetNum, months],
  );

  const monthCompare = useMemo(
    () => comparePlansByDuration(filtered, budgetNum, [1, 3, 6]),
    [filtered, budgetNum],
  );

  const cpmBars = useMemo(() => {
    const pts = estimateCpmByCategory(filtered);
    return pts.map((p) => ({
      key: p.key,
      label: isKo ? p.labelKo : p.labelEn,
      value: p.cpm,
    }));
  }, [filtered, isKo]);

  const reachSplit = reachSplitForGoal(campaignGoal);

  const goalTitle = useMemo(() => {
    const g = PLANNER_CAMPAIGN_GOAL_DEFS.find((x) => x.key === campaignGoal);
    return g ? t(g.titleKey) : "—";
  }, [campaignGoal, t]);

  const { maxItems: compareMax } = useCartCompareMax();

  const compareHref = useMemo(() => {
    const ids = Array.from(campaignMediaIds).slice(0, compareMax);
    const q = ids.join(",");
    return q ? `/compare?ids=${q}` : "/compare";
  }, [campaignMediaIds, compareMax]);

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
  const [creatingQuote, setCreatingQuote] = useState(false);


  // PR-D: 매체 상세 ?addMedia= · 찜 목록 ?mediaIds= · 내 플랜 ?from=plan
  const searchParams = useSearchParams();
  const addMediaId = searchParams.get("addMedia");
  const mediaIdsParam = searchParams.get("mediaIds");
  const fromPlanParam = searchParams.get("from");
  const loadPlanParam = searchParams.get("loadPlan");
  const createQuoteParam = searchParams.get("createQuote");
  const handledQueryRef = useRef<string | null>(null);
  const handledFromPlanRef = useRef(false);
  const handledLoadPlanRef = useRef<string | null>(null);
  const handledCreateQuoteRef = useRef(false);
  const [plannerStoreReady, setPlannerStoreReady] = useState(false);

  useEffect(() => {
    const persist = usePlannerStore.persist;
    if (!persist) {
      setPlannerStoreReady(true);
      return;
    }
    if (persist.hasHydrated()) {
      setPlannerStoreReady(true);
      return;
    }
    return persist.onFinishHydration(() => {
      setPlannerStoreReady(true);
    });
  }, []);

  const stripPlannerQueryKeys = useCallback((keys: string[]) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    for (const k of keys) url.searchParams.delete(k);
    window.history.replaceState({}, "", url.toString());
  }, []);

  /** 내 플랜 → 플래너: persist 재수화 후 카트로 교체 (옛 세션 merge 금지) */
  useEffect(() => {
    if (!plannerStoreReady) return;
    if (fromPlanParam !== "plan") return;
    if (handledFromPlanRef.current) return;
    handledFromPlanRef.current = true;

    const cart = getPlanCart();
    importFromPlanCart(cart);
    const afterImport = usePlannerStore.getState();
    const targetStep = resolveWizardStepAfterPlanCartImport(afterImport);
    setWizardStep(targetStep);
    handledQueryRef.current = "from:plan";

    const count = cart.items.length;
    const onReport = targetStep === PLANNER_RESULT_STEP;
    toast(
      "success",
      isKo
        ? count > 0
          ? onReport
            ? `내 플랜 매체 ${count}개로 보고서를 준비했습니다.`
            : `내 플랜 매체 ${count}개로 플래너를 시작합니다.`
          : onReport
            ? "내 플랜 설정으로 보고서를 준비했습니다."
            : "내 플랜 설정으로 플래너를 시작합니다."
        : count > 0
          ? onReport
            ? `Report ready with ${count} media from My plan.`
            : `Starting planner with ${count} media from My plan.`
          : onReport
            ? "Report ready from your My plan settings."
            : "Starting planner with your My plan settings.",
    );
    stripPlannerQueryKeys(["from", "mediaIds", "addMedia"]);
  }, [
    plannerStoreReady,
    fromPlanParam,
    importFromPlanCart,
    setWizardStep,
    isKo,
    stripPlannerQueryKeys,
    toast,
  ]);

  useEffect(() => {
    if (!plannerStoreReady) return;
    if (fromPlanParam === "plan") return;
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
    plannerStoreReady,
    fromPlanParam,
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
        const afterImport = usePlannerStore.getState();
        const targetStep = resolveWizardStepAfterPlanCartImport(afterImport);
        setWizardStep(targetStep);
        toast(
          "success",
          isKo
            ? targetStep === PLANNER_RESULT_STEP
              ? "저장된 플랜 보고서를 불러왔습니다."
              : "저장된 플랜을 불러왔습니다."
            : targetStep === PLANNER_RESULT_STEP
              ? "Saved plan report loaded."
              : "Saved plan loaded.",
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

  const goToContactQuote = useCallback(() => {
    if (navigatingContact) return;
    if (teamPerms.loaded && !teamPerms.canContactOrPay) {
      toast(
        "error",
        isKo
          ? "뷰어 권한은 견적 요청을 할 수 없습니다."
          : "Viewers cannot request quotes.",
      );
      return;
    }

    const mediaList =
      selectedMediaForSimulation.length > 0
        ? selectedMediaForSimulation
        : portfolio;
    if (mediaList.length === 0) {
      toast(
        "error",
        isKo ? "선택된 매체가 없습니다." : "No media selected.",
      );
      return;
    }

    const monthlyWon = mediaList.reduce((s, m) => s + (m.price || 0), 0);
    savePlanTransferData({
      mediaIds: mediaList.map((m) => m.id),
      mediaNames: mediaList.map((m) =>
        isKo ? m.name : m.nameEn || m.name,
      ),
      totalBudget: monthlyWon * months,
      duration: months,
      region: regionsSummary,
      goal: goalTitle,
      estimatedReach: metrics?.estimatedTotalImpressions,
      estimatedCpm: (() => {
        if (mediaList.length === 0) return undefined;
        const cpm = plannerBlendCpmKrw(
          mediaList,
          metrics?.estimatedMonthlyImpressions ?? 0,
        );
        return cpm != null && Number.isFinite(cpm) ? cpm : undefined;
      })(),
      source: "planner",
    });

    setNavigatingContact(true);
    router.push("/contact?from=planner");
    setNavigatingContact(false);
  }, [
    goalTitle,
    isKo,
    metrics?.estimatedMonthlyImpressions,
    metrics?.estimatedTotalImpressions,
    months,
    navigatingContact,
    portfolio,
    regionsSummary,
    router,
    selectedMediaForSimulation,
    teamPerms.canContactOrPay,
    teamPerms.loaded,
    toast,
  ]);

  /**
   * 플랜 데이터로 견적서를 직접 생성하고 미리보기로 이동.
   * 견적은 발신자 식별이 필요하므로 로그인 세션을 요구한다.
   * 비로그인 시 로그인 페이지로 보낸 뒤 `?createQuote=1` 로 복귀시켜 생성을 이어간다.
   */
  const createQuoteFromPlan = useCallback(async () => {
    if (creatingQuote) return;
    if (teamPerms.loaded && !teamPerms.canContactOrPay) {
      toast(
        "error",
        isKo
          ? "뷰어 권한은 견적서를 만들 수 없습니다."
          : "Viewers cannot create quotes.",
      );
      return;
    }

    const mediaList =
      selectedMediaForSimulation.length > 0
        ? selectedMediaForSimulation
        : portfolio;
    if (mediaList.length === 0) {
      toast("error", isKo ? "선택된 매체가 없습니다." : "No media selected.");
      return;
    }

    setCreatingQuote(true);
    try {
      let user:
        | { name?: string; email?: string; company?: string | null }
        | null = null;
      try {
        const sessionRes = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        const sessionData = await sessionRes.json();
        if (sessionData?.ok && sessionData.data?.email) {
          user = sessionData.data;
        }
      } catch {
        /* ignore */
      }

      if (!user?.email) {
        toast(
          "warning",
          isKo
            ? "견적서 생성을 위해 로그인이 필요합니다. 로그인 후 이어서 진행됩니다."
            : "Please sign in to generate a quote — we'll resume right after.",
        );
        router.push(
          `/login?redirect=${encodeURIComponent("/planner?createQuote=1")}`,
        );
        return;
      }

      const period = isKo
        ? `${months}개월`
        : `${months} month${months > 1 ? "s" : ""}`;
      const totalBudgetWon = budgetNum * months * 10_000;

      const res = await fetch("/api/quote/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaIds: mediaList.map((m) => m.id),
          clientName: user.name || user.email,
          clientEmail: user.email,
          clientCompany: user.company || undefined,
          period,
          budgetMax: totalBudgetWon > 0 ? totalBudgetWon : undefined,
          locale: isKo ? "ko" : "en",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        data?: { id?: string };
      };
      if (!res.ok || !data?.ok || !data.data?.id) {
        throw new Error("quote create failed");
      }
      router.push(`/quote/${data.data.id}/preview`);
    } catch (e) {
      console.error("[planner.createQuote] error", e);
      toast(
        "error",
        isKo
          ? "견적서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요."
          : "Could not create the quote. Please try again.",
      );
      setCreatingQuote(false);
    }
  }, [
    budgetNum,
    creatingQuote,
    isKo,
    months,
    portfolio,
    router,
    selectedMediaForSimulation,
    teamPerms.canContactOrPay,
    teamPerms.loaded,
    toast,
  ]);

  // 로그인 후 `?createQuote=1` 로 복귀하면 결과 단계로 이동 후 견적 생성을 재개.
  useEffect(() => {
    if (createQuoteParam !== "1") return;
    if (handledCreateQuoteRef.current) return;
    handledCreateQuoteRef.current = true;
    stripPlannerQueryKeys(["createQuote"]);
    setWizardStep(PLANNER_RESULT_STEP);
    void createQuoteFromPlan();
  }, [createQuoteParam, stripPlannerQueryKeys, setWizardStep, createQuoteFromPlan]);

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
        <div className="tkad-landing-neon overflow-x-clip">
          <PageHero
            eyebrow="// 01 · PLANNING"
            title="예산에 맞는 "
            highlight="미디어 플랜"
            description="AI가 최적 매체 조합과 예상 성과를 3분 안에 제안"
          />
          <SubTabs tabs={PLANNING_TABS} currentPath="/planner" />

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
      <div className="tkad-landing-neon w-full min-w-0 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <PageHero
          eyebrow="// 01 · PLANNING"
          title="예산에 맞는 "
          highlight="미디어 플랜"
          description="AI가 최적 매체 조합과 예상 성과를 3분 안에 제안"
        />
        <SubTabs tabs={PLANNING_TABS} currentPath="/planner" />

        <PlannerNeonPageBody
          appearance={landingAppearance}
          className="mx-auto w-full min-w-0 max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12"
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
          <div className="mx-auto w-full min-w-0 max-w-3xl space-y-8 overflow-x-clip">
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
              <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-clip">
                <div className="space-y-2 text-center sm:text-left">
                  <PlannerNeonLabel>Step 4 / Media Selection</PlannerNeonLabel>
                  <h2 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
                    {t("stepMediaTitle")}
                  </h2>
                  <p className={plannerNeon.subtext}>{t("stepMediaDesc")}</p>
                </div>

                <PlannerSelectedMediaBar
                  catalog={catalog}
                  supplementalById={mediaCacheById}
                  campaignMediaIds={campaignMediaIds}
                  onRemove={removePlannerMedia}
                  onClearAll={clearPlannerMedia}
                  isKo={isKo}
                />

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
                <div className="min-w-0 max-w-full overflow-x-clip">
                  <MediaSearchPage
                    embedded
                    plannerMode
                    initialMedia={plannerCatalogItems}
                    initialCatalogItems={catalog}
                    initialTotal={catalog.length}
                    plannerSelectedIds={campaignMediaIds}
                    onPlannerToggleMedia={togglePlannerMedia}
                    onPlannerClearMedia={clearPlannerMedia}
                  />
                </div>
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
                selectedMediaCount={campaignMediaIds.length}
                portfolioOverBudget={portfolioBudgetStatus.overBudget}
                portfolioMonthlyTotalMan={portfolioBudgetStatus.monthlyTotalMan}
                portfolioMonthlyBudgetMan={portfolioBudgetStatus.monthlyBudgetMan}
                isAutoPortfolio={isAutoPortfolio}
                unresolvedMediaCount={unresolvedMediaCount}
                activitySource="planner"
              />
            ) : null}

            <div className="flex w-full min-w-0 max-w-full flex-col-reverse gap-3 border-t dark:border-white/10 border-gray-100 pt-6 sm:flex-row sm:justify-between">
              <BtnBlock
                variant="secondary"
                size="md"
                className="w-full min-w-0 sm:w-auto"
                onClick={goBack}
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
          <div className="mx-auto w-full min-w-0 max-w-3xl space-y-8 overflow-x-clip">
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
                <PlannerReportInfoCard isKo={isKo} />

                <PlannerReportFreeSummary
                  isKo={isKo}
                  goalTitle={goalTitle}
                  budgetNum={budgetNum}
                  periodDisplay={`${months}${isKo ? "개월" : " mo"}`}
                  regionsText={regionsSummary}
                  categoriesText={categoriesSummary}
                  ageText={t(ageKey)}
                  industryText={t(industryKey)}
                  portfolio={portfolio}
                />

                <PlannerPortfolioNotice
                  isKo={isKo}
                  selectedCount={campaignMediaIds.length}
                  inPlanCount={portfolio.length}
                  overBudget={portfolioBudgetStatus.overBudget}
                  monthlyTotalMan={portfolioBudgetStatus.monthlyTotalMan}
                  monthlyBudgetMan={portfolioBudgetStatus.monthlyBudgetMan}
                  isAutoMix={isAutoPortfolio}
                  autoMixMax={PLANNER_AUTO_PORTFOLIO_MAX_ITEMS}
                  unresolvedCount={unresolvedMediaCount}
                />

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b dark:border-white/10 border-gray-100 p-5">
                    <PlannerNeonLabel>Portfolio</PlannerNeonLabel>
                    <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
                      {campaignMediaIds.length > 0
                        ? isKo
                          ? `선택 매체 구성 (${portfolio.length})`
                          : `Selected lineup (${portfolio.length})`
                        : t("comboTitle")}
                    </h3>
                    <p className={cn("mt-1 text-sm", plannerNeon.subtext)}>
                      {campaignMediaIds.length > 0
                        ? isKo
                          ? "4단계에서 담은 매체가 설계·보고서에 그대로 반영됩니다."
                          : "Media added in step 4 are included in the plan and report."
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
                          logoUrl={creativeUploadedUrl || creativeObjectUrl}
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
                          <p className="mt-2 text-sm font-bold tabular-nums text-violet-400">
                            {formatCatalogPriceFieldWon(m.price, isKo ? "ko" : "en")}
                          </p>
                          <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {!proLoading ? (
                  <div data-screenshot="planner-pro-blur">
                    <PlannerProGate
                      isPro={isPro}
                      isKo={isKo}
                      minHeightClass="min-h-[20rem]"
                      className="space-y-4"
                    >
                      <PlannerProTeaserStats
                        isKo={isKo}
                        totalImpressions={metrics.estimatedTotalImpressions}
                        reachCorePct={reachSplit.corePct}
                        roiExpected={metrics.roiExpected}
                      />
                      <PlannerReportPremiumBlock
                        isKo={isKo}
                        portfolio={portfolio}
                        budgetMan={budgetNum}
                        months={months}
                        regionsText={regionsSummary}
                        goal={campaignGoal}
                        industryText={t(industryKey)}
                      />
                      <PlannerEffectSimulationPanel
                        isKo={isKo}
                        portfolio={portfolio}
                        budgetMan={budgetNum}
                        months={months}
                        totalImpressionsFromMetrics={
                          metrics.estimatedTotalImpressions
                        }
                        skipProGate
                      />
                    </PlannerProGate>
                  </div>
                ) : null}

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px] p-6 sm:p-8">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] tkad-neon-grid" />
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.14),transparent_58%),radial-gradient(circle_at_55%_110%,rgba(236,72,153,0.12),transparent_60%)]" />
                  <div className="relative space-y-5">
                    <div className="space-y-2">
                      <PlannerNeonLabel>Next Step</PlannerNeonLabel>
                      <h3 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
                        {t("ctaBannerTitle")}
                      </h3>
                      <p className={plannerNeon.subtext}>
                        {t("ctaBannerDesc")}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <BtnBlock
                        variant="accent"
                        size="md"
                        className="w-full bg-gradient-to-r from-violet-500 to-cyan-400 font-bold text-white shadow-md shadow-violet-500/25"
                        onClick={() => void createQuoteFromPlan()}
                        disabled={
                          creatingQuote ||
                          (teamPerms.loaded && !teamPerms.canContactOrPay)
                        }
                      >
                        <FileText className="h-4 w-4" />
                        {creatingQuote
                          ? t("creatingQuote")
                          : t("ctaCreateQuoteFromPlan")}
                      </BtnBlock>
                      <BtnBlock
                        variant="secondary"
                        size="md"
                        className="w-full dark:text-white"
                        onClick={() => void goToContactQuote()}
                        disabled={
                          navigatingContact ||
                          (teamPerms.loaded && !teamPerms.canContactOrPay)
                        }
                      >
                        <Send className="h-4 w-4" />
                        {navigatingContact
                          ? t("savingInProgress")
                          : t("ctaExpertConsult")}
                      </BtnBlock>
                      <p className="text-center text-xs text-muted-foreground">
                        {t("quoteTrustLine")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <BtnBlock
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => void savePlan("share")}
                        disabled={saving || (teamPerms.loaded && !teamPerms.canUsePlanner)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {saving ? t("savingInProgress") : t("ctaSave")}
                      </BtnBlock>
                      <BtnBlock
                        variant="secondary"
                        size="sm"
                        className="w-full dark:text-white"
                        onClick={() => void savePlan("draft")}
                        disabled={saving || (teamPerms.loaded && !teamPerms.canUsePlanner)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t("ctaSaveDraft24h")}
                      </BtnBlock>
                      <BtnBlock
                        href={compareHref}
                        variant="secondary"
                        size="sm"
                        className="w-full dark:text-white"
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                        {t("ctaCompareSelection")}
                      </BtnBlock>
                      <BtnBlock
                        href="/proposal?fromPlanner=1"
                        variant="secondary"
                        size="sm"
                        className="w-full border-emerald-400/35 bg-emerald-500/10 dark:text-white"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        {t("ctaCreateProposal")}
                      </BtnBlock>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
              {t("disclaimer")}
            </p>
          </div>
        )}
        </PlannerNeonPageBody>
      </div>
      <ExitSurveyBanner surface="planner" />
    </HomeLandingDayNight>
  );
}
