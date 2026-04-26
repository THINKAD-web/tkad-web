"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
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
    setWizardStep(4);
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
  const savePlan = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const state = usePlannerStore.getState();
      const planJson = {
        campaignGoal: state.campaignGoal,
        regions: state.regions,
        categories: state.categories,
        budget: state.budget,
        months: state.months,
        ageKey: state.ageKey,
        industryKey: state.industryKey,
        campaignMediaIds: state.campaignMediaIds,
        creativeUploadedUrl: state.creativeUploadedUrl,
        mediaPlacements: state.mediaPlacements,
      };
      const res = await fetch("/api/planner/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planJson }),
      });
      if (!res.ok) {
        throw new Error(`save failed: ${res.status}`);
      }
      const data = (await res.json()) as { id: string; expiresAt: string };
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/${locale}/planner/shared/${data.id}`;
      setShareUrl(url);
      setSavedPlanId(data.id);
      // 링크를 즉시 클립보드에도 복사
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url).catch(() => {});
      }
      toast("success", t("savedToast"));
    } catch {
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
      <div className="min-h-screen bg-bx-white">
        <section className="bg-bx-black py-24 text-bx-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
              {`// 05 / Planner`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.22em] text-bx-white">
                THINKAD Planner
              </span>
              <span className="border-2 border-bx-white bg-bx-black/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.22em] text-bx-white">
                BETA
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl font-mono text-[12px] tracking-tight text-bx-white/75 sm:text-sm">
              {t("subtitle")}
            </p>
          </div>
        </section>
        <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ EMPTY CATALOG ]
          </p>
          <p className="mt-3 text-lg font-bold tracking-tight text-bx-black">
            {t("preparingMedia")}
          </p>
          <p className="mt-2 font-mono text-[12px] tracking-tight text-bx-gray-dim">
            {t("preparingMediaDesc")}
          </p>
          <div className="mt-8 inline-block">
            <BtnBlock href="/media" variant="accent" size="md">
              {t("browseMedia")}
            </BtnBlock>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bx-white">
      <section className="bg-bx-black py-20 text-bx-white sm:py-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// 05 / Planner`}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.22em] text-bx-white">
              THINKAD Planner
            </span>
            <span className="border-2 border-bx-white bg-bx-black/60 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.22em] text-bx-white">
              BETA
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl font-mono text-[12px] tracking-tight text-bx-white/75 sm:text-sm">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
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
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ STEP 2 / TARGET + REGION ]
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
                    {t("stepRegionTitle")}
                  </h2>
                  <p className="text-sm leading-relaxed text-bx-gray-dim">
                    {t("stepRegionDesc")}
                  </p>
                </div>

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ CATEGORY ]
                    </p>
                    <h3 className="mt-2 flex items-center gap-2 text-lg font-bold tracking-tight text-bx-black">
                      <Layers className="h-5 w-5 text-bx-accent" />
                      {t("category")}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                      {t("mediaMixHint")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-0 p-5">
                    {CATEGORIES.map(({ key, labelKey }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCategory(key)}
                        className={cn(
                          "-mt-[2px] -ml-[2px] border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors touch-manipulation",
                          categories.has(key)
                            ? "border-bx-accent bg-bx-accent text-bx-white"
                            : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                        )}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                <PlannerRegionMap
                  selected={selectedRegions}
                  counts={regionCounts}
                  onToggle={toggleRegion}
                  labelFor={mapLabel}
                  title={t("mapTitle")}
                  hint={t("mapHint")}
                  countLabel={(n) => t("mapCount", { count: n })}
                />

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t("packagesTitle")} ]
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-0 p-5 sm:grid-cols-3">
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
                        className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4 text-left transition-colors hover:bg-bx-off"
                      >
                        <p className="font-bold tracking-tight text-bx-black">{t(titleKey)}</p>
                        <p className="mt-2 font-mono text-[11px] leading-relaxed tracking-tight text-bx-gray-dim">
                          {t(descKey)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t("ageLabel")} ]
                    </p>
                    <div className="flex flex-wrap gap-0">
                      {PLANNER_AGE_KEYS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setAgeKey(k)}
                          className={cn(
                            "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                            ageKey === k
                              ? "border-bx-accent bg-bx-accent text-bx-white"
                              : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                          )}
                        >
                          {t(k)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t("industryLabel")} ]
                    </p>
                    <div className="flex flex-wrap gap-0">
                      {PLANNER_INDUSTRY_KEYS.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setIndustryKey(k)}
                          className={cn(
                            "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                            industryKey === k
                              ? "border-bx-accent bg-bx-accent text-bx-white"
                              : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
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
              <div className="border-2 border-bx-black bg-bx-white">
                <div className="border-b-2 border-bx-black p-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ STEP 3 / BUDGET + PERIOD ]
                  </p>
                  <h3 className="mt-2 flex items-center gap-2 text-lg font-bold tracking-tight text-bx-black">
                    <Wallet className="h-5 w-5 text-bx-accent" />
                    {t("stepBudgetTitle")}
                  </h3>
                  <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                    {t("stepBudgetDesc")}
                  </p>
                </div>
                <div className="space-y-6 p-5">
                  <div>
                    <div className="mb-3 flex justify-between font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-gray-dim">
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
                      className="h-3 w-full cursor-pointer appearance-none border-2 border-bx-black bg-bx-white"
                      style={{ accentColor: "#FF6600" }}
                      aria-label={t("budget")}
                    />
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[8rem]">
                        <label className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                          [ {t("budget")} ]
                        </label>
                        <input
                          inputMode="numeric"
                          value={budget}
                          onChange={(e) =>
                            setBudget(e.target.value.replace(/[^\d]/g, ""))
                          }
                          className="mt-1 h-11 w-full border-2 border-bx-black bg-bx-white px-3 font-mono font-bold text-bx-black focus:border-bx-accent focus:outline-none"
                        />
                      </div>
                      <p className="pb-1 font-mono text-[12px] tracking-tight text-bx-gray-dim">
                        {t("budgetPerMonthSummary", {
                          amount: Math.round(budgetNum / Math.max(months, 1)),
                        })}
                      </p>
                    </div>
                    {blurbParts ? (
                      <p className="mt-4 border-2 border-bx-accent bg-bx-white px-4 py-3 font-mono text-[11px] leading-relaxed tracking-tight text-bx-black">
                        <span className="mr-1 font-bold uppercase tracking-[0.22em] text-bx-accent">
                          {`// `}
                        </span>
                        {t("budgetBlurb", {
                          name: blurbParts.sampleName.slice(0, 32),
                          price: blurbParts.samplePrice,
                          slots: blurbParts.slotsAtMonth,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      <CalendarRange className="h-4 w-4" />
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
                              "-mt-[2px] -ml-[2px] border-2 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                              selected
                                ? "border-bx-accent bg-bx-accent text-bx-white"
                                : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
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
            ) : null}

            {/* Step 4 — 매체 선택 (AI 추천 + 직접 탐색) */}
            {wizardStep === 4 ? (
              <div className="space-y-6">
                <div className="space-y-2 text-center sm:text-left">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ STEP 4 / MEDIA SELECTION ]
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-bx-black sm:text-2xl">
                    {t("stepMediaTitle")}
                  </h2>
                  <p className="text-sm leading-relaxed text-bx-gray-dim">
                    {t("stepMediaDesc")}
                  </p>
                </div>

                <PlannerRecommendationPanel
                  catalog={catalog}
                  isKo={isKo}
                  regionLabel={mediaRegionLabel}
                />

                <div className="space-y-2 border-t-2 border-bx-black pt-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ MANUAL BROWSE ]
                  </p>
                  <h3 className="text-base font-bold tracking-tight text-bx-black">
                    {t("recommendBrowseTitle")}
                  </h3>
                  <p className="font-mono text-[11px] tracking-tight text-bx-gray-dim">
                    {t("recommendBrowseDesc")}
                  </p>
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
                metrics={metrics}
                reachCorePct={reachSplit.corePct}
                reachExtendedPct={reachSplit.extendedPct}
                logoUrl={creativeUploadedUrl || creativeObjectUrl}
                mediaPlacements={mediaPlacements}
              />
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t-2 border-bx-black pt-6 sm:flex-row sm:justify-between">
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <BtnBlock
                  variant="primary"
                  size="md"
                  onClick={savePlan}
                  disabled={saving}
                >
                  <Download className="h-4 w-4" />
                  {saving ? t("savingInProgress") : t("ctaSave")}
                </BtnBlock>
                <BtnBlock href={quoteHref} variant="accent" size="md">
                  <Send className="h-4 w-4" />
                  {t("ctaQuoteWithPlan")}
                </BtnBlock>
              </div>
            </div>

            {shareUrl ? (
              <div
                className="border-2 border-bx-accent bg-bx-white px-4 py-3"
                role="status"
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                  [ {t("shareBannerTitle")} ]
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 border-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-xs text-bx-black focus:border-bx-accent focus:outline-none"
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
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
                  {`// `}{t("shareBannerExpiry")}
                </p>
              </div>
            ) : null}

            {filtered.length === 0 ? (
              <div className="border-2 border-bx-black bg-bx-off py-12 text-center">
                <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-bx-gray-dim">
                  {`// `}{t("emptyFilter")}
                </p>
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
              <div className="border-2 border-bx-accent bg-bx-white py-10 text-center text-bx-black">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                  [ NEED BUDGET ]
                </p>
                <p className="mt-3 font-bold tracking-tight">
                  {t("needBudget")}
                </p>
              </div>
            ) : metrics ? (
              <>
                <div className="flex flex-col gap-2 border-2 border-bx-accent bg-bx-white px-4 py-3 text-sm text-bx-black sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white">
                      {t("estimatedModelBadge")}
                    </span>
                    <span className="min-w-0 text-left text-xs leading-relaxed sm:text-sm">
                      {t("estimatedModelHint")}
                    </span>
                  </div>
                </div>

                <p className="border-2 border-bx-black bg-bx-white px-4 py-3 text-sm text-bx-black">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
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
                      <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                          [ {t("kpiImpressions")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-accent">
                          {metrics.estimatedTotalImpressions.toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-gray-dim">
                          {t("kpiImpressionsHint")}
                        </p>
                      </div>
                      <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                          [ {t("kpiReach")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                          {estReach.toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-gray-dim">
                          {t("kpiReachHint")}
                        </p>
                      </div>
                      <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                          [ {t("kpiCpm")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                          ₩{estCpm.toLocaleString()}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-gray-dim">
                          {t("kpiCpmHint")}
                        </p>
                      </div>
                      <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-black p-4 text-bx-white">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                          [ {t("kpiRoi")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-accent">
                          {metrics.roiExpected}
                          {t("roiUnit")}
                        </p>
                        <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-white/65">
                          {t("kpiRoiHint")}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ PORTFOLIO ]
                    </p>
                    <h3 className="mt-2 text-lg font-bold tracking-tight text-bx-black">
                      {t("comboTitle")}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                      {manualIntersectedPortfolio.length > 0
                        ? t("comboHintManual")
                        : t("comboHint")}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-0 p-4 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolio.map((m) => (
                      <Link
                        key={m.id}
                        href={mediaItemDetailPath(m.id)}
                        className="group -mt-[2px] -ml-[2px] flex flex-col gap-2 border-2 border-bx-black bg-bx-white p-3 transition-colors hover:bg-bx-off"
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
                          <p className="line-clamp-2 text-sm font-bold tracking-tight text-bx-black">
                            {isKo ? m.name : (m.nameEn || m.name) || m.name}
                          </p>
                          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                            {`// `}{tm(`regions.${m.region}`)} ·{" "}
                            {isKo
                              ? m.location.slice(0, 40)
                              : (m.locationEn || m.location).slice(0, 40)}
                          </p>
                          <p className="mt-2 font-mono text-sm font-bold tabular-nums text-bx-accent">
                            ₩{m.price.toLocaleString()}
                            <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-bx-gray-dim">
                              {isKo ? "만/월" : "₩10K/mo"}
                            </span>
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-2">
                  <div className="border-2 border-bx-black bg-bx-white">
                    <div className="border-b-2 border-bx-black p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("results")} ]
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-0 p-4 sm:grid-cols-2">
                      <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                          [ {t("matchedMedia")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                          {filtered.length}
                          <span className="ml-1 text-base text-bx-gray-dim">
                            {t("countUnit")}
                          </span>
                        </p>
                      </div>
                      <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                          [ {t("avgMonthlySlot")} ]
                        </p>
                        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                          {Math.round(metrics.avgMonthlyPrice).toLocaleString()}
                          <span className="ml-1 text-sm text-bx-gray-dim">
                            {isKo ? "만원/월" : "₩10K/mo"}
                          </span>
                        </p>
                      </div>
                      <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4 sm:col-span-2">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                          [ {t("estMonthlyImp")} ]
                        </p>
                        <p className="mt-2 font-mono text-xl font-bold tabular-nums text-bx-black">
                          {metrics.estimatedMonthlyImpressions.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="-ml-[2px] border-2 border-bx-black bg-bx-white p-6 lg:mt-0">
                    <PlannerReachDonutChart
                      corePct={reachSplit.corePct}
                      extendedPct={reachSplit.extendedPct}
                      title={t("chartReachTitle")}
                      coreLabel={t("reachCore")}
                      extendedLabel={t("reachExtended")}
                    />
                  </div>
                </div>

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t("chartDailyBarTitle")} ]
                    </p>
                  </div>
                  <div className="p-5">
                    <PlannerDailyReachBarChart
                      data={dailyBars}
                      title={t("chartDailyBarTitle")}
                      valueLabel={t("chartDailyBarAxis")}
                    />
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-2">
                  <div className="border-2 border-bx-black bg-bx-white p-6">
                    <PlannerBudgetPieChart
                      data={pieSlices}
                      title={t("chartBudgetPieTitle")}
                      unitLabel={t("chartBudgetPieUnit")}
                    />
                  </div>
                  <div className="-ml-[2px] border-2 border-bx-black bg-bx-white lg:mt-0">
                    <div className="border-b-2 border-bx-black p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("chartCpmTitle")} ]
                      </p>
                    </div>
                    <div className="p-5">
                      <PlannerCpmCompareChart
                        data={cpmBars}
                        title={t("chartCpmTitle")}
                        unitLabel={t("chartCpmUnit")}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t("chartMonthCompareTitle")} ]
                    </p>
                  </div>
                  <div className="p-5">
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

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ ROI ]
                    </p>
                    <h3 className="mt-2 flex items-center gap-2 text-lg font-bold tracking-tight text-bx-black">
                      <TrendingUp className="h-5 w-5 text-bx-accent" />
                      {t("roiTitle")}
                    </h3>
                  </div>
                  <div className="space-y-4 p-5">
                    {(
                      [
                        ["roiConservative", metrics.roiConservative],
                        ["roiExpected", metrics.roiExpected],
                        ["roiOptimistic", metrics.roiOptimistic],
                      ] as const
                    ).map(([labelKey, val]) => (
                      <div key={labelKey}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-black">
                            {t(labelKey)}
                          </span>
                          <span className="font-mono font-bold tabular-nums text-bx-accent">
                            {val}
                            {t("roiUnit")}
                          </span>
                        </div>
                        <div className="h-3 w-full border-2 border-bx-black bg-bx-white">
                          <div
                            className="h-full bg-bx-accent transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (val / roiMax) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t("chartImpLineTitle")} ]
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                      {t("chartImpTitle")}
                    </p>
                  </div>
                  <div className="p-5">
                    <PlannerImpressionsLineChart
                      data={metrics.cumulativeByMonth}
                      isKo={isKo}
                      title={t("chartImpLineTitle")}
                    />
                  </div>
                </div>

                <div className="border-2 border-bx-black bg-bx-white">
                  <div className="border-b-2 border-bx-black p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {t("chartRoiLineTitle")} ]
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                      {t("chartRoiLineHint")}
                    </p>
                  </div>
                  <div className="p-5">
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

                <div className="border-2 border-bx-black bg-bx-black p-6 text-bx-white sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl space-y-2">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ NEXT STEP ]
                      </p>
                      <h3 className="text-xl font-bold tracking-tight text-bx-white sm:text-2xl">
                        {t("ctaBannerTitle")}
                      </h3>
                      <p className="text-sm leading-relaxed text-bx-white/75">
                        {t("ctaBannerDesc")}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[240px]">
                      <BtnBlock
                        href={quoteHref}
                        variant="accent"
                        size="lg"
                        className="w-full"
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
      </div>
    </div>
  );
}
