"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parsePlannerFreetextBrief,
  type PlannerFreetextParseResult,
} from "@/lib/planner/parse-freetext-brief";
import {
  buildFreetextBriefSummarySentence,
  buildFreetextEvidenceRows,
  type FreetextEvidenceRow,
} from "@/lib/planner/freetext-brief-summary";
import { buildFreetextBriefApply } from "@/lib/planner/freetext-brief-apply";
import type { FreetextBriefApplySummary } from "@/lib/planner/freetext-brief-apply";
import { FreetextExampleChips } from "@/components/planner/freetext-example-chips";
import { usePlannerStore } from "@/lib/planner/store";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";

const PLACEHOLDER_KO =
  '예) "강남 2030 브랜딩 3000만원" — 지역·타깃·목표·예산을 자연어로 입력';
const PLACEHOLDER_EN =
  'e.g. "Gangnam Gen Z branding 30M KRW monthly" — natural-language brief';

export type FreetextApplySummary = FreetextBriefApplySummary;

type Props = {
  isKo: boolean;
  onApplied?: (summary: FreetextApplySummary) => void;
};

function SourceQuote({ source }: { source: string | null }) {
  if (!source?.trim()) return null;
  return (
    <span className="text-muted-foreground">
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
      <span>
        <span className="font-medium">{row.label}</span>
        <span className="text-muted-foreground">: </span>
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

export function PlannerFreetextBetaPanel({ isKo, onApplied }: Props) {
  const [text, setText] = useState("");
  const [parseResult, setParseResult] =
    useState<PlannerFreetextParseResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const applyScenario = usePlannerStore((s) => s.applyScenario);
  const setWizardStep = usePlannerStore((s) => s.setWizardStep);

  const summarySentence = useMemo(
    () =>
      parseResult ? buildFreetextBriefSummarySentence(parseResult, isKo) : null,
    [parseResult, isKo],
  );

  const evidenceRows = useMemo(
    () => (parseResult ? buildFreetextEvidenceRows(parseResult, isKo) : []),
    [parseResult, isKo],
  );

  const runAnalyze = useCallback((input?: string) => {
    const trimmed = (input ?? text).trim();
    if (trimmed.length < 3) return;
    if (input != null) setText(input);
    setAnalyzing(true);
    try {
      setParseResult(parsePlannerFreetextBrief(trimmed));
    } finally {
      setAnalyzing(false);
    }
  }, [text]);

  const handleApply = useCallback(() => {
    if (!parseResult) return;
    const payload = buildFreetextBriefApply(parseResult.raw, isKo);
    if (!payload) return;
    applyScenario(payload.patch);
    setWizardStep(4);
    onApplied?.(payload.summary);
  }, [applyScenario, isKo, onApplied, parseResult, setWizardStep]);

  return (
    <PlannerNeonCard className="overflow-hidden">
      <div className={plannerNeon.cardHeader}>
        <div className="flex flex-wrap items-center gap-2">
          <PlannerNeonLabel className="!text-violet-600 dark:!text-violet-300">
            {isKo ? "AI 자연어 입력" : "AI natural language"}
          </PlannerNeonLabel>
          <span className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-200">
            {isKo ? "무료 · 규칙" : "Free · Rules"}
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

        <FreetextExampleChips
          isKo={isKo}
          onSelect={(example) => runAnalyze(example)}
          disabled={analyzing}
          chipClassName={cn(plannerNeon.selectChip, plannerNeon.selectChipIdle)}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runAnalyze()}
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

        {parseResult && summarySentence ? (
          <div className="space-y-4 border-t dark:border-white/10 border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isKo ? "AI 분석 결과" : "Analysis result"}
            </p>

            <div
              className={cn(
                "space-y-4 rounded-xl border p-4 sm:p-5",
                "border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] to-cyan-500/[0.05]",
                "dark:border-violet-400/20 dark:from-violet-500/10 dark:to-cyan-500/5",
              )}
            >
              <p className="text-sm font-semibold leading-relaxed text-foreground sm:text-base">
                {summarySentence}
              </p>

              {evidenceRows.length > 0 ? (
                <ul className="space-y-2 border-t border-violet-400/15 pt-3 dark:border-white/10">
                  {evidenceRows.map((row) => (
                    <EvidenceRow key={row.key} row={row} isKo={isKo} />
                  ))}
                </ul>
              ) : null}

              {parseResult.unmatchedTokens.length > 0 ? (
                <div className="flex gap-2 border-t border-amber-400/20 pt-3 text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <p>
                    {isKo ? "미해석: " : "Unparsed: "}
                    <span className="font-medium">
                      {parseResult.unmatchedTokens.join(", ")}
                    </span>
                    {isKo
                      ? " — Step 2~3에서 직접 선택해 주세요."
                      : " — set manually in Steps 2–3."}
                  </p>
                </div>
              ) : null}

              <p className="text-xs leading-relaxed text-muted-foreground">
                {isKo
                  ? "→ 이 조건으로 Step 4 맞춤 추천을 불러옵니다."
                  : "→ Step 4 will load tailored recommendations from this brief."}
              </p>
            </div>

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
