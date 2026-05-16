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
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
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
import { PlannerRegionMap } from "@/components/planner-region-map";
import PlannerTips from "@/components/planner-tips";
import { PlannerBrandStep } from "@/components/planner/planner-brand-step";
import { PlannerBudgetScheduleStep } from "@/components/planner/planner-budget-schedule-step";
import { PlannerAiRecommendStep } from "@/components/planner/planner-ai-recommend-step";
import { PlannerSaveShareStep } from "@/components/planner/planner-save-share-step";
import PlannerReportStep, {
  PlannerReportPdfCompact,
} from "@/components/planner-report-step";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { PlannerStepper } from "@/components/planner/stepper";
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
  PLANNER_RESULT_STEP,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerMapRegion,
} from "@/lib/planner/types";
import { selectBudgetNum, usePlannerStore } from "@/lib/planner/store";
import { canProceedFromStep } from "@/lib/planner/validation";
import {
  formatPricePeriodShortLabel,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import type { HomeAppearance } from "@/lib/home-appearance";
import { useTkadAppearance } from "@/lib/use-tkad-appearance";

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
      <div className="relative overflow-hidden bg-[#05050a] text-white">
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
  const landingAppearance = useTkadAppearance();

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

  const quoteHref =
    portfolio.length > 0
      ? `/quote?media=${portfolio.map((m) => m.id).join(",")}`
      : "/quote";

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

  // PR-D: 매체 상세에서 ?addMedia=<id> 로 진입 시 Step 4 사전 선택
  const searchParams = useSearchParams();
  const addMediaId = searchParams.get("addMedia");
  const handledAddMediaRef = useRef<string | null>(null);
  useEffect(() => {
    if (!addMediaId) return;
    if (handledAddMediaRef.current === addMediaId) return;
    handledAddMediaRef.current = addMediaId;

    const exists = catalog.some((m) => m.id === addMediaId);
    if (!exists) {
      toast(
        "error",
        isKo
          ? "선택한 매체를 찾을 수 없습니다."
          : "Selected media not found.",
      );
      return;
    }
    setCampaignMediaIds((prev) =>
      prev.includes(addMediaId) ? prev : [...prev, addMediaId],
    );
    setWizardStep(3);
    toast(
      "success",
      isKo
        ? "매체가 캠페인에 추가되었습니다."
        : "Media added to your campaign.",
    );
    // URL 정리 — addMedia query 제거 (history 보존)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("addMedia");
      window.history.replaceState({}, "", url.toString());
    }
  }, [addMediaId, catalog, setCampaignMediaIds, setWizardStep, toast, isKo]);

  /**
   * 현재 플래너 입력을 DB 에 저장하고 공유 가능한 URL 을 반환.
   * 기존 localStorage persist 는 유지 — DB 저장은 "공유/이메일 발송" 시점에만.
   */
  const savePlan = useCallback(async (saveMode: "share" | "draft" = "share") => {
    if (saving) return;
    setSaving(true);
    try {
      // PlannerStore 의 Set 등 직렬화 불가 타입은 JSON 변환 시 손실됨 → 안전한 형태로 평탄화.
      const state = usePlannerStore.getState();
      const planJson = {
        brandName: state.brandName,
        campaignPurposes: state.campaignPurposes,
        campaignGoal: state.campaignGoal,
        regions: Array.from(state.regions),
        categories: Array.from(state.categories),
        budget: state.budget,
        months: state.months,
        ageKey: state.ageKey,
        genderKey: state.genderKey,
        interestKeys: state.interestKeys,
        industryKey: state.industryKey,
        flightStart: state.flightStart,
        flightEnd: state.flightEnd,
        campaignMediaIds: Array.from(state.campaignMediaIds),
        aiBudgetByMediaId: state.aiBudgetByMediaId,
        aiRecommendSummary: state.aiRecommendSummary,
        creativeUploadedUrl: state.creativeUploadedUrl,
        mediaPlacements: state.mediaPlacements,
      };

      const res = await fetch("/api/planner/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planJson, saveMode }),
      });

      if (!res.ok) {
        // 서버 에러 응답을 가능한 만큼 읽어 콘솔에 남김 (사용자 모를 디테일 로깅).
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
        throw new Error(`save failed: ${res.status}${detail ? ` — ${detail}` : ""}`);
      }

      const data = (await res.json()) as { id?: string; expiresAt?: string };
      if (!data.id) {
        console.error("[planner.save] missing id in response", data);
        throw new Error("Invalid response: missing id");
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/${locale}/planner/plan/${data.id}`;
      setShareUrl(url);
      setSavedPlanId(data.id);
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
  }, [saving, toast, t, isKo, locale]);

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
          <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
            <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
            <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
            <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
            />

            <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pb-32 sm:pt-32 lg:px-8 lg:pb-44 lg:pt-40">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
                {`// 05 / Planner`}
              </p>
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
                <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                  <span className="tkad-home-accent-text">THINKAD Planner</span>
                </span>
                <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                  <span className="tkad-home-accent-text">BETA</span>
                </span>
              </div>
              <h1 className="mt-6 text-balance text-[clamp(44px,5.8vw,76px)] font-[950] leading-[0.92] tracking-[-0.065em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
                {t("title")}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
                {t("subtitle")}
              </p>
            </div>
          </section>

          <PlannerNeonPageBody
            appearance={landingAppearance}
            className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/70">
              [ EMPTY CATALOG ]
            </p>
            <p className="mt-3 text-lg font-bold tracking-tight text-foreground">
              {t("preparingMedia")}
            </p>
            <p className="mt-2 font-mono text-[12px] tracking-tight text-muted-foreground">
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
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-24 text-center sm:px-6 sm:pb-32 sm:pt-32 lg:px-8 lg:pb-44 lg:pt-40">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
              {`// 05 / Planner`}
            </p>
            <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
              <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                <span className="tkad-home-accent-text">THINKAD Planner</span>
              </span>
              <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                <span className="tkad-home-accent-text">BETA</span>
              </span>
            </div>
            <h1 className="mt-6 text-balance text-[clamp(44px,5.8vw,76px)] font-[950] leading-[0.92] tracking-[-0.065em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
              {t("title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
              {t("subtitle")}
            </p>
          </div>
        </section>

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
            stepLabels={{
              1: t("stepBrandShort"),
              2: t("stepBudgetShort"),
              3: t("stepAiShort"),
              4: t("stepSaveShort"),
            }}
            onStepClick={(s) => setWizardStep(s)}
          />
        ) : null}

        {wizardStep <= PLANNER_LAST_INPUT_STEP ? (
          <div
            className={cn(
              "mx-auto space-y-8",
              // 매체 선택·소재 업로드·보고서 단계는 넓은 캔버스 필요
              wizardStep === 3 || wizardStep === 4
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

            {wizardStep === 1 ? <PlannerBrandStep /> : null}

            {wizardStep === 2 ? (
              <PlannerBudgetScheduleStep
                catalog={catalog}
                regionCounts={regionCounts}
                mapLabel={mapLabel}
              />
            ) : null}

            {wizardStep === 3 ? (
              <PlannerAiRecommendStep catalog={catalog} />
            ) : null}

            {wizardStep === 4 ? (
              <PlannerSaveShareStep
                shareUrl={shareUrl}
                saving={saving}
                onSave={() => void savePlan("share")}
                onQuote={() => {
                  if (typeof window !== "undefined") {
                    window.location.href = quoteHref;
                  }
                }}
              />
            ) : null}

                        <div className="flex flex-col-reverse gap-3 border-t-2 border-border pt-6 sm:flex-row sm:justify-between">
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
                {wizardStep === PLANNER_LAST_INPUT_STEP ? (
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
              wizardStep={PLANNER_RESULT_STEP}
              campaignGoal={campaignGoal}
              campaignMediaCount={campaignMediaIds.length}
              hasCreative={Boolean(creativeObjectUrl)}
              budgetNum={budgetNum}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <BtnBlock
                variant="secondary"
                size="md"
                onClick={() => setWizardStep(1)}
                className="w-full sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("editInputs")}
              </BtnBlock>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <BtnBlock
                  variant="primary"
                  size="md"
                  onClick={() => void savePlan("share")}
                  disabled={saving}
                >
                  <Download className="h-4 w-4" />
                  {saving ? t("savingInProgress") : t("ctaSave")}
                </BtnBlock>
                <BtnBlock
                  variant="secondary"
                  size="md"
                  onClick={() => void savePlan("draft")}
                  disabled={saving}
                >
                  <Download className="h-4 w-4" />
                  {t("ctaSaveDraft24h")}
                </BtnBlock>
                <BtnBlock href={compareHref} variant="secondary" size="md">
                  <GitCompare className="h-4 w-4" />
                  {t("ctaCompareSelection")}
                </BtnBlock>
                <BtnBlock
                  href={quoteHref}
                  variant="accent"
                  size="md"
                  className="!text-white"
                >
                  <Send className="h-4 w-4" />
                  {t("ctaQuoteWithPlan")}
                </BtnBlock>
              </div>
            </div>

            {shareUrl ? (
              <div
                className="border-2 border-primary bg-card px-4 py-3"
                role="status"
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ {t("shareBannerTitle")} ]
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 border-2 border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
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
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {`// `}{t("shareBannerExpiry")}
                </p>
              </div>
            ) : null}

            {filtered.length === 0 ? (
              <div className="border-2 border-border bg-muted py-12 text-center">
                <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                  {`// `}{t("emptyFilter")}
                </p>
                <div className="mt-6 flex justify-center">
                  <BtnBlock
                    variant="primary"
                    size="md"
                    onClick={() => setWizardStep(1)}
                  >
                    {t("editInputs")}
                  </BtnBlock>
                </div>
              </div>
            ) : budgetNum < PLANNER_BUDGET_MIN ? (
              <div className="border-2 border-primary bg-card py-10 text-center text-foreground">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  [ NEED BUDGET ]
                </p>
                <p className="mt-3 font-bold tracking-tight">
                  {t("needBudget")}
                </p>
              </div>
            ) : metrics ? (
              <>
                <div className="tkad-glass-surface relative flex flex-col gap-2 overflow-hidden rounded-[22px] px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/14 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-foreground backdrop-blur">
                      {t("estimatedModelBadge")}
                    </span>
                    <span className="min-w-0 text-left text-xs leading-relaxed sm:text-sm">
                      {t("estimatedModelHint")}
                    </span>
                  </div>
                </div>

                <p className="tkad-glass-surface rounded-[22px] px-4 py-3 text-sm text-foreground">
                  <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] tkad-home-accent-text">
                    [ {t("targetSummaryLabel")} ]
                  </span>{" "}
                  {(() => {
                    const g = GOALS.find((x) => x.key === campaignGoal);
                    return g ? t(g.titleKey) : "—";
                  })()}
                  {" · "}
                  {t("ageLabel")}: {t(ageKey)} · {t("industryLabel")}:{" "}
                  {t(industryKey)}
                </p>

                {/* PR-7: 핵심 KPI 4장 — Impressions / Reach / CPM / ROI(기대) */}
                {(() => {
                  const budgetKrw = budgetNum * 10_000;
                  const estReach = Math.round(
                    metrics.estimatedTotalImpressions * 0.75,
                  );
                  const estCpm =
                    metrics.estimatedTotalImpressions > 0
                      ? Math.round(
                          (budgetKrw /
                            metrics.estimatedTotalImpressions) *
                            1000,
                        )
                      : 0;
                  return (
                    <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="tkad-glass-surface -mt-[2px] -ml-[2px] rounded-[22px] p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          [ {t("kpiImpressions")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#22d3ee]">
                          {metrics.estimatedTotalImpressions.toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-muted-foreground">
                          {t("kpiImpressionsHint")}
                        </p>
                      </div>
                      <div className="tkad-glass-surface -mt-[2px] -ml-[2px] rounded-[22px] p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          [ {t("kpiReach")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                          {estReach.toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-muted-foreground">
                          {t("kpiReachHint")}
                        </p>
                      </div>
                      <div className="tkad-glass-surface -mt-[2px] -ml-[2px] rounded-[22px] p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          [ {t("kpiCpm")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                          ₩{estCpm.toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-muted-foreground">
                          {t("kpiCpmHint")}
                        </p>
                      </div>
                      <div className="tkad-glass-surface -mt-[2px] -ml-[2px] rounded-[22px] p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] tkad-home-accent-text">
                          [ {t("kpiRoi")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#22d3ee]">
                          {metrics.roiExpected}
                          {t("roiUnit")}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-muted-foreground">
                          {t("kpiRoiHint")}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                  <div className="relative border-b border-white/10 p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ PORTFOLIO ]
                    </p>
                    <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
                      {t("comboTitle")}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
                      {manualIntersectedPortfolio.length > 0
                        ? t("comboHintManual")
                        : t("comboHint")}
                    </p>
                  </div>
                  <div className="relative grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolio.map((m) => (
                      <Link
                        key={m.id}
                        href={mediaItemDetailPath(m.id)}
                        className="group tkad-glass-surface flex flex-col gap-2 rounded-[22px] p-3 transition-all hover:-translate-y-0.5 hover:bg-white/10"
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
                          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            {`// `}{tm(`regions.${m.region}`)} ·{" "}
                            {isKo
                              ? m.location.slice(0, 40)
                              : (m.locationEn || m.location).slice(0, 40)}
                          </p>
                          <p className="mt-2 font-mono text-sm font-bold tabular-nums text-primary">
                            ₩{m.price.toLocaleString()}
                            <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                              {isKo ? "만/월" : "₩10K/mo"}
                            </span>
                          </p>
                          {(() => {
                            const badge = priceOptionBadge(m);
                            if (!badge) return null;
                            return (
                              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                [ {badge} ]
                              </p>
                            );
                          })()}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="tkad-glass-surface relative overflow-hidden rounded-[26px]">
                    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                    <div className="relative border-b border-white/10 p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        [ {t("results")} ]
                      </p>
                    </div>
                    <div className="relative grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                      <div className="tkad-glass-surface rounded-[22px] p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          [ {t("matchedMedia")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                          {filtered.length}
                          <span className="ml-1 text-base text-muted-foreground">
                            {t("countUnit")}
                          </span>
                        </p>
                      </div>
                      <div className="tkad-glass-surface rounded-[22px] p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          [ {t("avgMonthlySlot")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
                          {Math.round(metrics.avgMonthlyPrice).toLocaleString()}
                          <span className="ml-1 text-sm text-muted-foreground">
                            {isKo ? "만원/월" : "₩10K/mo"}
                          </span>
                        </p>
                      </div>
                      <div className="tkad-glass-surface rounded-[22px] p-4 sm:col-span-2">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          [ {t("estMonthlyImp")} ]
                        </p>
                        <p className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">
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
                  <div className="relative border-b border-white/10 p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ {t("chartDailyBarTitle")} ]
                    </p>
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
                    <div className="relative border-b border-white/10 p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        [ {t("chartCpmTitle")} ]
                      </p>
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
                  <div className="relative border-b border-white/10 p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ {t("chartMonthCompareTitle")} ]
                    </p>
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
                  <div className="relative border-b border-white/10 p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ ROI ]
                    </p>
                    <h3 className="mt-2 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                      <TrendingUp className="h-5 w-5 text-primary" />
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
                          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                            {t(labelKey)}
                          </span>
                          <span className="font-mono font-bold tabular-nums text-primary">
                            {val}
                            {t("roiUnit")}
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/10">
                          <div
                            className="h-full bg-primary transition-all duration-500"
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
                  <div className="relative border-b border-white/10 p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ {t("chartImpLineTitle")} ]
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
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
                  <div className="relative border-b border-white/10 p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      [ {t("chartRoiLineTitle")} ]
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
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

                <div className="tkad-glass-surface relative overflow-hidden rounded-[26px] p-6 sm:p-8">
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] tkad-neon-grid" />
                  <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.14),transparent_58%),radial-gradient(circle_at_55%_110%,rgba(236,72,153,0.12),transparent_60%)]" />
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl space-y-2">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                        [ NEXT STEP ]
                      </p>
                      <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {t("ctaBannerTitle")}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {t("ctaBannerDesc")}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[240px]">
                      <BtnBlock
                        href={quoteHref}
                        variant="accent"
                        size="lg"
                        className="w-full !text-white"
                      >
                        <Send className="h-4 w-4" />
                        {t("ctaQuoteWithPlan")}
                        <ArrowRight className="h-4 w-4" />
                      </BtnBlock>
                      <BtnBlock
                        href={
                          savedPlanId
                            ? `/contact?plan=${savedPlanId}`
                            : "/contact"
                        }
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
