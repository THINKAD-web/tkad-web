"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  HelpCircle,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildScenarioPatchFromFreetextParse,
  parsePlannerFreetextBrief,
  type ParsedField,
  type PlannerFreetextParseResult,
} from "@/lib/planner/parse-freetext-brief";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import {
  PLANNER_SEOUL_ZONE_LABELS,
  type PlannerSeoulZoneKey,
} from "@/lib/planner/seoul-zones";
import { plannerRegionLabel } from "@/lib/planner/planner-regions";
import { usePlannerStore } from "@/lib/planner/store";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";

const GOAL_LABELS: Record<PlannerCampaignGoal, { ko: string; en: string }> = {
  brand: { ko: "브랜딩·인지", en: "Brand awareness" },
  launch: { ko: "런칭·출시", en: "Launch" },
  event: { ko: "프로모션·이벤트", en: "Promotion / event" },
  sales: { ko: "전환·매출", en: "Conversion" },
  local: { ko: "로컬·상권", en: "Local" },
};

const INDUSTRY_LABELS: Record<PlannerIndustryKey, { ko: string; en: string }> =
  {
    indFb: { ko: "F&B", en: "F&B" },
    indRetail: { ko: "리테일·뷰티", en: "Retail / beauty" },
    indTech: { ko: "IT·테크", en: "Tech" },
    indFinance: { ko: "금융", en: "Finance" },
    indEnt: { ko: "엔터", en: "Entertainment" },
    indOther: { ko: "기타", en: "Other" },
};

const AGE_LABELS: Record<PlannerAgeKey, { ko: string; en: string }> = {
  ageAll: { ko: "전 연령", en: "All ages" },
  age20s: { ko: "20대", en: "20s" },
  age30s: { ko: "30대", en: "30s" },
  age40s: { ko: "40대", en: "40s" },
  age50plus: { ko: "50대+", en: "50s+" },
};

const PLACEHOLDER_KO =
  '예) "강남 2030 브랜딩 3000만원" — 지역·타깃·목표·예산을 자연어로 입력';
const PLACEHOLDER_EN =
  'e.g. "Gangnam Gen Z branding 30M KRW monthly" — natural-language brief';

type Props = {
  isKo: boolean;
  onApplied?: () => void;
};

function FieldChip({
  label,
  recognized,
  valueText,
  isKo,
}: {
  label: string;
  recognized: boolean;
  valueText: string | null;
  isKo: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-xl border px-3 py-2 text-sm",
        recognized
          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
          : "border-amber-400/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
      )}
    >
      {recognized ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">·</span>
      <span className="truncate">
        {recognized && valueText
          ? valueText
          : isKo
            ? "인식 못함 — 직접 선택"
            : "Not detected — pick manually"}
      </span>
    </div>
  );
}

function formatRegions(
  regions: string[] | null,
  zones: PlannerSeoulZoneKey[] | null,
  isKo: boolean,
): string | null {
  if (!regions?.length && !zones?.length) return null;
  const parts: string[] = [];
  if (regions?.length) {
    for (const r of regions) {
      parts.push(plannerRegionLabel(r, isKo));
    }
  }
  if (zones?.length) {
    for (const z of zones) {
      const row = PLANNER_SEOUL_ZONE_LABELS[z];
      parts.push(isKo ? row.labelKo : row.labelEn);
    }
  }
  return [...new Set(parts)].join(", ");
}

function formatFieldSummary(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): {
  key: string;
  label: string;
  recognized: boolean;
  valueText: string | null;
}[] {
  const { fields } = result;
  const fmt = <T,>(f: ParsedField<T>, text: string | null) => ({
    recognized: f.value != null,
    valueText: text,
  });

  return [
    {
      key: "goal",
      label: isKo ? "목표" : "Goal",
      ...fmt(
        fields.campaignGoal,
        fields.campaignGoal.value
          ? (isKo
              ? GOAL_LABELS[fields.campaignGoal.value].ko
              : GOAL_LABELS[fields.campaignGoal.value].en)
          : null,
      ),
    },
    {
      key: "region",
      label: isKo ? "지역" : "Region",
      recognized: !!(
        fields.regions.value?.length || fields.seoulZones.value?.length
      ),
      valueText: formatRegions(
        fields.regions.value,
        fields.seoulZones.value,
        isKo,
      ),
    },
    {
      key: "age",
      label: isKo ? "타깃" : "Target",
      ...fmt(
        fields.ageKeys,
        fields.ageKeys.value
          ? fields.ageKeys.value
              .map((k) => (isKo ? AGE_LABELS[k].ko : AGE_LABELS[k].en))
              .join(", ")
          : null,
      ),
    },
    {
      key: "industry",
      label: isKo ? "업종" : "Industry",
      ...fmt(
        fields.industryKey,
        fields.industryKey.value
          ? (isKo
              ? INDUSTRY_LABELS[fields.industryKey.value].ko
              : INDUSTRY_LABELS[fields.industryKey.value].en)
          : null,
      ),
    },
    {
      key: "budget",
      label: isKo ? "예산" : "Budget",
      ...fmt(
        fields.budgetMan,
        fields.budgetMan.value != null
          ? isKo
            ? `월 ${fields.budgetMan.value.toLocaleString("ko-KR")}만원`
            : `${fields.budgetMan.value.toLocaleString()}M KRW/mo`
          : null,
      ),
    },
    {
      key: "months",
      label: isKo ? "기간" : "Duration",
      ...fmt(
        fields.months,
        fields.months.value != null
          ? isKo
            ? `${fields.months.value}개월`
            : `${fields.months.value} mo`
          : null,
      ),
    },
  ];
}

export function PlannerFreetextBetaPanel({
  isKo,
  onApplied,
}: Props) {
  const [text, setText] = useState("");
  const [parseResult, setParseResult] =
    useState<PlannerFreetextParseResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const applyScenario = usePlannerStore((s) => s.applyScenario);
  const setWizardStep = usePlannerStore((s) => s.setWizardStep);

  const chips = useMemo(
    () => (parseResult ? formatFieldSummary(parseResult, isKo) : []),
    [parseResult, isKo],
  );

  const handleAnalyze = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length < 3) return;
    setAnalyzing(true);
    try {
      setParseResult(parsePlannerFreetextBrief(trimmed));
    } finally {
      setAnalyzing(false);
    }
  }, [text]);

  const handleApply = useCallback(() => {
    if (!parseResult) return;
    const patch = buildScenarioPatchFromFreetextParse(parseResult);
    applyScenario(patch);
    setWizardStep(4);
    onApplied?.();
  }, [applyScenario, onApplied, parseResult, setWizardStep]);

  return (
    <PlannerNeonCard className="overflow-hidden">
      <div className={plannerNeon.cardHeader}>
        <div className="flex flex-wrap items-center gap-2">
          <PlannerNeonLabel className="!text-violet-600 dark:!text-violet-300">
            {isKo ? "AI 자연어 입력" : "AI natural language"}
          </PlannerNeonLabel>
          <span className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-200">
            {isKo ? "베타 · 무료" : "Beta · Free"}
          </span>
        </div>
        <h3
          className={cn(
            "mt-2 flex items-center gap-2 text-lg",
            plannerNeon.headline,
          )}
        >
          <Sparkles className="h-5 w-5 text-violet-400" aria-hidden />
          {isKo
            ? "키워드로 조건을 분석해 추천합니다"
            : "Keyword-based brief analysis"}
        </h3>
        <p className={cn("mt-2 text-sm leading-relaxed", plannerNeon.subtext)}>
          {isKo
            ? "자연어로 조건을 입력하면 키워드 규칙으로 분석해 추천합니다. 베타 기능이며 인식되지 않은 항목은 직접 선택해 주세요."
            : "Enter your campaign in plain language; we parse keywords (rule-based, no LLM). Unrecognized fields can be set manually in later steps."}
        </p>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isKo ? PLACEHOLDER_KO : PLACEHOLDER_EN}
          rows={3}
          maxLength={2000}
          className={cn(
            "w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed",
            "dark:border-white/12 border-gray-200 dark:bg-black/20 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-violet-400/40",
          )}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || text.trim().length < 3}
            className={cn(plannerNeon.ctaSm, "disabled:opacity-50")}
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {isKo ? "분석" : "Analyze"}
          </button>
        </div>

        {parseResult ? (
          <div className="space-y-3 border-t dark:border-white/10 border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isKo ? "분석 결과" : "Parse result"}
            </p>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <FieldChip
                  key={c.key}
                  label={c.label}
                  recognized={c.recognized}
                  valueText={c.valueText}
                  isKo={isKo}
                />
              ))}
            </div>
            {parseResult.unmatchedTokens.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {isKo ? "미매칭:" : "Unmatched:"}{" "}
                {parseResult.unmatchedTokens.join(", ")}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleApply}
              className={cn(plannerNeon.cta, "w-full sm:w-auto")}
            >
              {isKo ? "이대로 추천 받기" : "Recommend with this brief"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </PlannerNeonCard>
  );
}
