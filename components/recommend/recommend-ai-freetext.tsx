"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Loader2, Wand2, Pencil, Check } from "lucide-react";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { RecommendBriefFields } from "@/lib/recommend-freetext-parse";
import { RECOMMEND_FREETEXT_GOAL_OPTS } from "@/lib/recommend/campaign-goal-options";
import {
  parsePlannerFreetextBrief,
  type PlannerFreetextParseResult,
} from "@/lib/planner/parse-freetext-brief";
import {
  buildFreetextBriefSummarySentence,
  buildFreetextEvidenceRows,
  type FreetextEvidenceRow,
} from "@/lib/planner/freetext-brief-summary";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";
import { buildAiRecommendInputFromFreetext } from "@/lib/recommend/build-freetext-recommend-input";
import {
  applyFreetextRecommendDraftDefaults,
  FREETEXT_RECOMMEND_DEFAULT_BUDGET_MAN,
} from "@/lib/recommend/freetext-recommend-defaults";
import { FreetextExampleChips } from "@/components/planner/freetext-example-chips";
import { cn } from "@/lib/utils";

/**
 * AI 자연어 입력 — 규칙 파서(0토큰).
 * 자유텍스트 → parsePlannerFreetextBrief → 추출 조건 확인/수정 → onConfirm.
 * (/api/recommend/parse Haiku 는 호출하지 않음)
 */

type Props = {
  locale: string;
  /** 확인/수정 완료 후 호출 — 상위에서 runAnalysis(excludeNetwork) 실행 */
  onConfirm: (input: AiRecommendInput) => void;
};

type GoalKey = "awareness" | "consideration" | "launch";
type TargetKey = "genz" | "millennial" | "family" | "biz" | "mass";
type IndustryKey =
  | "retail"
  | "fintech"
  | "fmcg"
  | "auto"
  | "entertainment"
  | "beauty"
  | "other";

const TARGET_OPTS: { value: TargetKey; ko: string; en: string }[] = [
  { value: "genz", ko: "Z세대(10~20대 초)", en: "Gen Z" },
  { value: "millennial", ko: "20~30대", en: "Millennial" },
  { value: "family", ko: "가족·40대+", en: "Family / 40s+" },
  { value: "biz", ko: "직장인·B2B", en: "Business" },
  { value: "mass", ko: "전체 (불특정 다수)", en: "All audiences" },
];
const INDUSTRY_OPTS: { value: IndustryKey; ko: string; en: string }[] = [
  { value: "retail", ko: "리테일·유통", en: "Retail" },
  { value: "fintech", ko: "금융·핀테크", en: "Fintech" },
  { value: "fmcg", ko: "생활소비재", en: "FMCG" },
  { value: "auto", ko: "자동차", en: "Auto" },
  { value: "entertainment", ko: "엔터·콘텐츠", en: "Entertainment" },
  { value: "beauty", ko: "뷰티", en: "Beauty" },
  { value: "other", ko: "전체", en: "All industries" },
];

const PLACEHOLDER_KO =
  '예) "강남 2030 뷰티 브랜딩 500만원" — 목적·타깃·지역·예산·업종';
const PLACEHOLDER_EN =
  'e.g. "Gangnam beauty branding for 20s-30s, 5M KRW monthly" — goal, target, region, budget';

type Phase = "input" | "confirm";

type Draft = {
  goal: string;
  target: string;
  budgetMan: string;
  region: string;
  industry: string;
};

function fieldsToDraft(f: RecommendBriefFields): Draft {
  return {
    goal: f.goal ?? "",
    target: f.target ?? "",
    budgetMan: f.budgetMaxMan != null ? String(f.budgetMaxMan) : "",
    region: f.region ?? "",
    industry: f.industry ?? "",
  };
}

function SourceQuote({ source }: { source: string | null }) {
  if (!source?.trim()) return null;
  return (
    <span className="text-gray-500 dark:text-white/50">
      {" "}
      「{source.trim()}」
    </span>
  );
}

function EvidenceRow({
  row,
  isKo,
}: {
  row: FreetextEvidenceRow;
  isKo: boolean;
}) {
  return (
    <li className="flex gap-2 text-sm leading-relaxed">
      <Check
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
      <span className="text-gray-800 dark:text-white/85">
        <span className="font-medium">{row.label}</span>
        <span className="text-gray-500 dark:text-white/55">: </span>
        <span>{row.valueText}</span>
        <SourceQuote source={row.source} />
        {row.confidence === "low" ? (
          <span className="text-xs text-amber-700 dark:text-amber-300">
            {isKo ? " · 약하게 인식" : " · low confidence"}
          </span>
        ) : null}
      </span>
    </li>
  );
}

export default function RecommendAiFreetext({ locale, onConfirm }: Props) {
  const isKo = locale === "ko";
  const tr = useTranslations("recommend");

  const goalOpts = useMemo(
    () =>
      RECOMMEND_FREETEXT_GOAL_OPTS.map((o) => ({
        value: o.value,
        label: tr(o.titleKey),
      })),
    [tr],
  );

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] =
    useState<PlannerFreetextParseResult | null>(null);
  const [draft, setDraft] = useState<Draft>({
    goal: "",
    target: "",
    budgetMan: "",
    region: "",
    industry: "",
  });
  const [budgetDefaulted, setBudgetDefaulted] = useState(false);

  const summarySentence = useMemo(
    () =>
      parseResult ? buildFreetextBriefSummarySentence(parseResult, isKo) : null,
    [parseResult, isKo],
  );

  const evidenceRows = useMemo(
    () => (parseResult ? buildFreetextEvidenceRows(parseResult, isKo) : []),
    [parseResult, isKo],
  );

  const analyze = useCallback(
    (input?: string, opts?: { autoConfirm?: boolean }) => {
      const trimmed = (input ?? text).trim();
      if (input != null) setText(input);
      if (trimmed.length < 3) {
        setError(
          isKo
            ? "캠페인 조건을 조금 더 자세히 입력해주세요."
            : "Please describe your campaign in a bit more detail.",
        );
        return;
      }
      setParsing(true);
      setError(null);
      try {
        const result = parsePlannerFreetextBrief(trimmed);
        const { draft: withDefaults, budgetDefaulted: defaulted } =
          applyFreetextRecommendDraftDefaults(
            fieldsToDraft(plannerFreetextToRecommendBrief(result, isKo)),
            result,
            isKo,
          );

        if (opts?.autoConfirm) {
          const built = buildAiRecommendInputFromFreetext(
            result,
            withDefaults,
            trimmed,
            isKo,
          );
        if (built) {
          setParsing(false);
          onConfirm(built);
          return;
        }
        }

        setParseResult(result);
        setDraft(withDefaults);
        setBudgetDefaulted(defaulted);
        setPhase("confirm");
      } finally {
        setParsing(false);
      }
    },
    [text, isKo, onConfirm],
  );

  const runRecommend = useCallback(() => {
    if (!parseResult) return;
    const { draft: withDefaults } = applyFreetextRecommendDraftDefaults(
      draft,
      parseResult,
      isKo,
    );
    const input = buildAiRecommendInputFromFreetext(
      parseResult,
      withDefaults,
      text,
      isKo,
    );
    if (!input) {
      setError(
        isKo
          ? "광고 목적을 선택해주세요."
          : "Please select a campaign goal.",
      );
      return;
    }
    onConfirm(input);
  }, [draft, isKo, onConfirm, parseResult, text]);

  const freeRuleBadge = (
    <span className="rounded-md border border-[color:var(--qp-accent)]/35 bg-[color:var(--qp-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--qp-accent)]">
      {isKo ? "무료 · 규칙" : "Free · Rules"}
    </span>
  );

  if (phase === "confirm") {
    const selCls =
      "h-11 w-full rounded-xl border bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--qp-accent)]/35 dark:bg-white/8 dark:text-white";
    const emptyRing = "border-amber-300 dark:border-amber-400/50";
    const filledRing = "border-gray-200 dark:border-white/10";
    const parsedRegions = parseResult?.fields.regions.value ?? [];
    const parsedZones = parseResult?.fields.seoulZones.value ?? [];
    const parsedBusanZones = parseResult?.fields.busanZones.value ?? [];
    const parsedGyeonggiZones = parseResult?.fields.gyeonggiZones.value ?? [];
    const parsedIncheonZones = parseResult?.fields.incheonZones.value ?? [];
    const hasParsedRegion =
      parsedRegions.length > 0 ||
      parsedZones.length > 0 ||
      parsedBusanZones.length > 0 ||
      parsedGyeonggiZones.length > 0 ||
      parsedIncheonZones.length > 0;
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <Wand2 className="h-4 w-4 text-[color:var(--qp-accent)]" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {isKo ? "AI 자연어 입력" : "AI natural language"}
          </p>
          {freeRuleBadge}
        </div>

        {summarySentence ? (
          <div
            className={cn(
              "space-y-3 rounded-xl border p-4",
              "border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent-soft)]",
              "dark:border-[color:var(--qp-accent)]/25",
            )}
          >
            <p className="text-sm font-semibold leading-relaxed text-gray-900 dark:text-white">
              {summarySentence}
            </p>
            {evidenceRows.length > 0 ? (
              <ul className="space-y-1.5 border-t border-gray-200 pt-3 dark:border-white/10">
                {evidenceRows.map((row) => (
                  <EvidenceRow key={row.key} row={row} isKo={isKo} />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-gray-500 dark:text-white/55">
          {isKo
            ? "확인 후 필요 시 수정하세요. 업종·타깃·예산은 비워도 기본값으로 추천됩니다."
            : "Review and edit if needed. Industry, target, and budget default when empty."}
        </p>
        {budgetDefaulted ? (
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-700 dark:border-white/12 dark:bg-white/5 dark:text-white/80">
            {isKo
              ? `예산 미입력 시 월 ${FREETEXT_RECOMMEND_DEFAULT_BUDGET_MAN.toLocaleString("ko-KR")}만원 기준으로 추천합니다.`
              : `When budget is empty, recommendations use ${FREETEXT_RECOMMEND_DEFAULT_BUDGET_MAN}M KRW/month.`}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">
              {isKo ? "광고 목적" : "Goal"}
            </span>
            <select
              value={draft.goal}
              onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
              className={cn(selCls, draft.goal ? filledRing : emptyRing)}
            >
              <option value="">{isKo ? "선택" : "Select"}</option>
              {goalOpts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">
              {isKo ? "핵심 타깃" : "Target"}
            </span>
            <select
              value={draft.target}
              onChange={(e) =>
                setDraft((d) => ({ ...d, target: e.target.value }))
              }
              className={cn(selCls, draft.target ? filledRing : emptyRing)}
            >
              <option value="">{isKo ? "선택" : "Select"}</option>
              {TARGET_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {isKo ? o.ko : o.en}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">
              {isKo ? "월 예산 상한 (만원)" : "Monthly budget (10K KRW)"}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.budgetMan}
              onChange={(e) =>
                setDraft((d) => ({ ...d, budgetMan: e.target.value }))
              }
              placeholder={isKo ? "예: 500" : "e.g. 500"}
              className={cn(
                selCls,
                Number(draft.budgetMan) > 0 ? filledRing : emptyRing,
              )}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">
              {isKo
                ? hasParsedRegion
                  ? "희망 지역"
                  : "희망 지역 (선택 · 미입력 시 전국)"
                : hasParsedRegion
                  ? "Region"
                  : "Region (optional · nationwide if empty)"}
            </span>
            <input
              type="text"
              value={draft.region}
              onChange={(e) =>
                setDraft((d) => ({ ...d, region: e.target.value }))
              }
              placeholder={
                isKo
                  ? hasParsedRegion
                    ? "예: 서울 강남"
                    : "비우면 전국 검색"
                  : hasParsedRegion
                    ? "e.g. Seoul Gangnam"
                    : "Leave empty for nationwide"
              }
              className={cn(
                selCls,
                hasParsedRegion
                  ? draft.region.trim()
                    ? filledRing
                    : emptyRing
                  : filledRing,
              )}
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">
              {isKo ? "업종" : "Industry"}
            </span>
            <select
              value={draft.industry}
              onChange={(e) =>
                setDraft((d) => ({ ...d, industry: e.target.value }))
              }
              className={cn(selCls, draft.industry ? filledRing : emptyRing)}
            >
              <option value="">{isKo ? "선택" : "Select"}</option>
              {INDUSTRY_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {isKo ? o.ko : o.en}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <p className="text-xs font-medium text-rose-500">{error}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runRecommend}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[color:var(--qp-accent)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[color:var(--qp-accent-hover)]"
          >
            <Sparkles className="h-4 w-4" />
            {isKo ? "추천 받기" : "Get recommendations"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("input");
              setParseResult(null);
              setError(null);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 dark:border-white/10 dark:text-white/70"
          >
            <Pencil className="h-3.5 w-3.5" />
            {isKo ? "다시 입력" : "Edit text"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-4 w-4 text-[color:var(--qp-accent)]" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {isKo ? "AI 자연어 입력" : "AI natural language"}
        </p>
        {freeRuleBadge}
      </div>
      <p className="text-xs text-gray-500 dark:text-white/55">
        {isKo
          ? "키워드 규칙으로 목적·타깃·지역·예산·업종을 분석합니다. 추측하지 않으며, 빠진 항목은 다음 화면에서 직접 채웁니다."
          : "Rule-based keyword parsing for goal, target, region, budget, and industry — no guessing; fill gaps on the next screen."}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={isKo ? PLACEHOLDER_KO : PLACEHOLDER_EN}
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--qp-accent)]/35 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder-white/30"
      />
      <FreetextExampleChips
        isKo={isKo}
        onSelect={(example) => analyze(example, { autoConfirm: true })}
        disabled={parsing}
      />
      {error ? <p className="text-xs font-medium text-rose-500">{error}</p> : null}
      <button
        type="button"
        onClick={() => analyze()}
        disabled={parsing || text.trim().length < 3}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[color:var(--qp-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--qp-accent-hover)] disabled:opacity-60"
      >
        {parsing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        {isKo ? "조건 분석" : "Analyze"}
      </button>
    </div>
  );
}
