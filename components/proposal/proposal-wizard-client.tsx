"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CategoryExploreHero } from "@/components/category-explore-hero";
import { BtnBlock } from "@/components/brutalist";
import { ProposalResultDisplay } from "@/components/proposal/proposal-result-display";
import type { MediaItem } from "@/lib/media-data";
import {
  recommendPlannerMedia,
  type RecommendationContext,
} from "@/lib/planner/recommend";
import type {
  CampaignProposalOutput,
  ProposalGoal,
  ProposalInput,
} from "@/lib/proposal/types";
import type { PlannerCampaignGoal } from "@/lib/planner/types";
import { isSavedPlannerPlanId } from "@/lib/planner/contact-prefill";
import { usePlannerStore } from "@/lib/planner/store";
import {
  parsePlannerBudgetManwon,
  plannerGoalTitleKey,
  plannerGoalToProposalGoal,
  plannerPeriodDates,
} from "@/lib/proposal/prefill-from-planner";
import { cn } from "@/lib/utils";

const glassCard =
  "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur sm:p-6";

const inputClass =
  "mt-1.5 w-full rounded-xl border dark:border-white/14 border-gray-200 dark:bg-black bg-white/30 px-3 py-2.5 text-sm dark:text-white text-gray-900 placeholder:dark:text-white text-gray-400 focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/20";

const labelClass =
  "block font-mono text-[10px] font-bold uppercase tracking-[0.18em] dark:text-white text-gray-500";

function goalToPlanner(goal: ProposalGoal): PlannerCampaignGoal {
  if (goal === "awareness") return "brand";
  if (goal === "conversion") return "sales";
  return "event";
}

type Props = {
  catalog: MediaItem[];
};

export default function ProposalWizardClient({ catalog }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("proposal");
  const tPlanner = useTranslations("planner");
  const searchParams = useSearchParams();
  const fromPlanner = searchParams.get("fromPlanner") === "1";
  const plannerPrefillDone = useRef(false);

  const [step, setStep] = useState(1);
  const [plannerPrefillNotice, setPlannerPrefillNotice] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [targetAge, setTargetAge] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [targetInterests, setTargetInterests] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetManwon, setBudgetManwon] = useState(3000);
  const [goal, setGoal] = useState<ProposalGoal>("awareness");
  const [regionsText, setRegionsText] = useState("");
  const [mediaIds, setMediaIds] = useState<string[]>([]);
  const [loadPlanId, setLoadPlanId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    id: string | null;
    proposal: CampaignProposalOutput;
    input: ProposalInput;
  } | null>(null);

  useEffect(() => {
    if (!fromPlanner || plannerPrefillDone.current) return;
    plannerPrefillDone.current = true;

    const {
      campaignGoal,
      regions: plannerRegions,
      budget,
      months,
      ageKey,
      industryKey,
      campaignMediaIds,
    } = usePlannerStore.getState();

    const titleKey = plannerGoalTitleKey(campaignGoal);
    if (titleKey) {
      setCampaignName(tPlanner(titleKey));
    }
    setGoal(plannerGoalToProposalGoal(campaignGoal));
    setBudgetManwon(parsePlannerBudgetManwon(budget));
    if (plannerRegions.length > 0) {
      setRegionsText(plannerRegions.join(", "));
    }
    const { startDate: start, endDate: end } = plannerPeriodDates(months);
    setStartDate(start);
    setEndDate(end);
    if (ageKey !== "ageAll") {
      setTargetAge(tPlanner(ageKey));
    }
    setIndustry(tPlanner(industryKey));
    if (campaignMediaIds.length > 0) {
      setMediaIds(campaignMediaIds);
    }
    setPlannerPrefillNotice(true);
  }, [fromPlanner, tPlanner]);

  const regions = useMemo(
    () =>
      regionsText
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [regionsText],
  );

  const recommendCtx: RecommendationContext = useMemo(
    () => ({
      goal: goalToPlanner(goal),
      regions,
      categories: [],
      ageKey: "ageAll",
      industryKey: null,
      budgetMan: budgetManwon,
      months: Math.max(
        1,
        startDate && endDate
          ? Math.ceil(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                (30 * 86400000),
            )
          : 1,
      ),
    }),
    [goal, regions, budgetManwon, startDate, endDate],
  );

  const aiRecommended = useMemo(
    () => recommendPlannerMedia(catalog, recommendCtx, 5, 0).map((s) => s.media),
    [catalog, recommendCtx],
  );

  const step1Valid =
    brandName.trim().length > 0 &&
    industry.trim().length > 0 &&
    campaignName.trim().length > 0;
  const step2Valid =
    !!startDate &&
    !!endDate &&
    budgetManwon >= 100 &&
    regions.length > 0;
  const step3Valid = mediaIds.length > 0;

  const toggleMedia = (id: string) => {
    setMediaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const applyAiRecommend = () => {
    setMediaIds(aiRecommended.map((m) => m.id));
  };

  const loadPlannerPlan = useCallback(async () => {
    const id = loadPlanId.trim();
    if (!isSavedPlannerPlanId(id)) {
      setGenError(t("invalidPlanId"));
      return;
    }
    setGenError(null);
    try {
      const res = await fetch(`/api/planner/shared/${id}`);
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        planJson: {
          campaignMediaIds?: string[];
          regions?: string[];
          budget?: string;
          campaignGoal?: string;
        };
      };
      const plan = data.planJson ?? {};
      if (Array.isArray(plan.campaignMediaIds) && plan.campaignMediaIds.length) {
        setMediaIds(plan.campaignMediaIds.filter((x) => typeof x === "string"));
      }
      if (Array.isArray(plan.regions) && plan.regions.length) {
        setRegionsText(plan.regions.join(", "));
      }
      if (plan.budget) {
        const n = Number(String(plan.budget).replace(/\D/g, ""));
        if (n >= 100) setBudgetManwon(n);
      }
      if (plan.campaignGoal === "brand") setGoal("awareness");
      else if (plan.campaignGoal === "sales") setGoal("conversion");
      else if (plan.campaignGoal === "event") setGoal("event");
    } catch {
      setGenError(t("planLoadError"));
    }
  }, [loadPlanId, t]);

  const buildInput = (): ProposalInput => ({
    brandName: brandName.trim(),
    industry: industry.trim(),
    campaignName: campaignName.trim(),
    targetAge: targetAge.trim(),
    targetGender: targetGender.trim(),
    targetInterests: targetInterests.trim(),
    startDate,
    endDate,
    budgetManwon,
    goal,
    regions,
    mediaIds,
    loadedPlanId: loadPlanId.trim() || null,
    locale: isKo ? "ko" : "en",
  });

  const onGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/proposal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildInput()),
      });
      const data = (await res.json()) as {
        error?: string;
        id?: string | null;
        proposal?: CampaignProposalOutput;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (!data.proposal) throw new Error("No proposal");
      const input = buildInput();
      setResult({
        id: data.id ?? null,
        proposal: data.proposal,
        input,
      });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : t("generateError"));
    } finally {
      setGenerating(false);
    }
  };

  if (result) {
    return (
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] bg-gray-50 pb-20 dark:bg-[#05050a]">
          <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
              [ {t("resultEyebrow")} ]
            </p>
            <h1 className="mt-2 text-2xl font-bold dark:text-white text-gray-900 sm:text-3xl">
              {result.input.campaignName}
            </h1>
            <p className="mt-1 text-sm dark:text-white text-gray-500">{result.input.brandName}</p>
            <div className="mt-8">
              <ProposalResultDisplay
                input={result.input}
                proposal={result.proposal}
                proposalId={result.id}
                sharePath={result.id ? `/proposal/${result.id}` : undefined}
                isKo={isKo}
              />
            </div>
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-sm font-semibold text-cyan-400 hover:underline"
              >
                {t("editAgain")}
              </button>
            </div>
          </div>
        </div>
      </HomeLandingDayNight>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)] bg-gray-50 pb-20 dark:bg-[#05050a]">
        <CategoryExploreHero
          code={`// ${t("heroEyebrow")}`}
          headlineBefore=""
          headlineGradient={t("heroTitle")}
          subtitle={t("heroDesc")}
        />

        <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
          <div className="mb-8 flex justify-center gap-2">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={cn(
                  "h-2 w-12 rounded-full transition-colors",
                  step === n
                    ? "bg-gradient-to-r from-violet-500 to-cyan-400"
                    : step > n
                      ? "bg-cyan-400/40"
                      : "bg-white/15",
                )}
                aria-hidden
              />
            ))}
          </div>

          {plannerPrefillNotice ? (
            <p
              className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-100/90"
              role="status"
            >
              {t("prefilledFromPlanner")}
            </p>
          ) : null}

          <div className={cn(glassCard, "relative overflow-hidden")}>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20 tkad-neon-grid"
            />

            {step === 1 ? (
              <div className="relative space-y-4">
                <h2 className="text-lg font-bold dark:text-white text-gray-900">{t("step1Title")}</h2>
                <label className="block">
                  <span className={labelClass}>{t("brandName")}</span>
                  <input
                    className={inputClass}
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>{t("industry")}</span>
                  <input
                    className={inputClass}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>{t("campaignName")}</span>
                  <input
                    className={inputClass}
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>{t("targetAge")}</span>
                  <input
                    className={inputClass}
                    value={targetAge}
                    onChange={(e) => setTargetAge(e.target.value)}
                    placeholder={t("targetAgePlaceholder")}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>{t("targetGender")}</span>
                  <input
                    className={inputClass}
                    value={targetGender}
                    onChange={(e) => setTargetGender(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>{t("targetInterests")}</span>
                  <textarea
                    className={cn(inputClass, "min-h-[72px] resize-y")}
                    value={targetInterests}
                    onChange={(e) => setTargetInterests(e.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="relative space-y-4">
                <h2 className="text-lg font-bold dark:text-white text-gray-900">{t("step2Title")}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>{t("startDate")}</span>
                    <input
                      type="date"
                      className={inputClass}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>{t("endDate")}</span>
                    <input
                      type="date"
                      className={inputClass}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>{t("budgetManwon")}</span>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    className={inputClass}
                    value={budgetManwon}
                    onChange={(e) => setBudgetManwon(Number(e.target.value))}
                  />
                </label>
                <fieldset>
                  <legend className={labelClass}>{t("goal")}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["awareness", t("goalAwareness")],
                        ["conversion", t("goalConversion")],
                        ["event", t("goalEvent")],
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setGoal(val)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          goal === val
                            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-200"
                            : "dark:border-white/14 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-600 hover:dark:bg-white/10 bg-gray-100",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block">
                  <span className={labelClass}>{t("regions")}</span>
                  <input
                    className={inputClass}
                    value={regionsText}
                    onChange={(e) => setRegionsText(e.target.value)}
                    placeholder={t("regionsPlaceholder")}
                  />
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="relative space-y-4">
                <h2 className="text-lg font-bold dark:text-white text-gray-900">{t("step3Title")}</h2>
                <div className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-black bg-white/25 p-3">
                  <p className={labelClass}>{t("loadPlanner")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      className={cn(inputClass, "mt-0 flex-1 min-w-[140px]")}
                      value={loadPlanId}
                      onChange={(e) => setLoadPlanId(e.target.value)}
                      placeholder={t("loadPlannerPlaceholder")}
                    />
                    <BtnBlock
                      variant="secondary"
                      size="sm"
                      onClick={() => void loadPlannerPlan()}
                      className="dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900"
                    >
                      {t("loadPlannerBtn")}
                    </BtnBlock>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BtnBlock
                    variant="accent"
                    size="sm"
                    className="!dark:text-white text-gray-900"
                    onClick={applyAiRecommend}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t("aiRecommend")}
                  </BtnBlock>
                  <Link
                    href="/media"
                    className="inline-flex items-center text-xs font-semibold text-cyan-400 hover:underline"
                  >
                    {t("browseMedia")}
                  </Link>
                </div>
                <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {catalog.slice(0, 80).map((m) => {
                    const selected = mediaIds.includes(m.id);
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => toggleMedia(m.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                            selected
                              ? "border-cyan-400/40 bg-cyan-400/10 dark:text-white text-gray-900"
                              : "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-700 hover:dark:bg-white/10 bg-gray-100",
                          )}
                        >
                          <span className="min-w-0 truncate font-medium">
                            {isKo ? m.name : m.nameEn || m.name}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 font-mono text-[10px]",
                              selected ? "text-cyan-300" : "dark:text-white text-gray-400",
                            )}
                          >
                            {selected ? "✓" : "+"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="font-mono text-[10px] dark:text-white">
                  {t("selectedCount", { count: mediaIds.length })}
                </p>
              </div>
            ) : null}

            {genError ? (
              <p className="relative mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {genError}
              </p>
            ) : null}

            <div className="relative mt-8 flex flex-wrap justify-between gap-3">
              {step > 1 ? (
                <BtnBlock
                  variant="secondary"
                  size="md"
                  onClick={() => setStep((s) => s - 1)}
                  className="dark:border-white/14 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("back")}
                </BtnBlock>
              ) : (
                <span />
              )}
              {step < 3 ? (
                <BtnBlock
                  variant="accent"
                  size="md"
                  className="!dark:text-white text-gray-900 bg-gradient-to-r from-violet-500 to-cyan-400"
                  disabled={
                    (step === 1 && !step1Valid) || (step === 2 && !step2Valid)
                  }
                  onClick={() => setStep((s) => s + 1)}
                >
                  {t("next")}
                  <ChevronRight className="h-4 w-4" />
                </BtnBlock>
              ) : (
                <BtnBlock
                  variant="accent"
                  size="md"
                  className="!dark:text-white text-gray-900 bg-gradient-to-r from-violet-500 to-cyan-400"
                  disabled={!step3Valid || generating}
                  onClick={() => void onGenerate()}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {generating ? t("generating") : t("generate")}
                </BtnBlock>
              )}
            </div>
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
