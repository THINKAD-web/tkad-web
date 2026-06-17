"use client";

import { useCallback, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useIsPro } from "@/hooks/use-is-pro";
import { Sparkles, Loader2, Lock, Wand2, Pencil } from "lucide-react";
import type { AiRecommendInput } from "@/lib/ai-media-recommend";
import type { RecommendBriefFields } from "@/lib/recommend-freetext-parse";
import { cn } from "@/lib/utils";

/**
 * AI 자유입력 모드 (PRO 전용).
 * 자유텍스트 → /api/recommend/parse(Haiku) → 추출 조건 확인/수정 화면 → 사용자 확인 후 onConfirm.
 * 파싱 결과를 검증 없이 바로 매칭에 넘기지 않는다(확인 단계 필수).
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

const GOAL_OPTS: { value: GoalKey; ko: string; en: string }[] = [
  { value: "awareness", ko: "브랜드 인지", en: "Awareness" },
  { value: "consideration", ko: "관심·고려", en: "Consideration" },
  { value: "launch", ko: "신규 런칭", en: "Launch" },
];
const TARGET_OPTS: { value: TargetKey; ko: string; en: string }[] = [
  { value: "genz", ko: "Z세대(10~20대 초)", en: "Gen Z" },
  { value: "millennial", ko: "20~30대", en: "Millennial" },
  { value: "family", ko: "가족·40대+", en: "Family / 40s+" },
  { value: "biz", ko: "직장인·B2B", en: "Business" },
  { value: "mass", ko: "불특정 다수", en: "Mass" },
];
const INDUSTRY_OPTS: { value: IndustryKey; ko: string; en: string }[] = [
  { value: "retail", ko: "리테일·유통", en: "Retail" },
  { value: "fintech", ko: "금융·핀테크", en: "Fintech" },
  { value: "fmcg", ko: "생활소비재", en: "FMCG" },
  { value: "auto", ko: "자동차", en: "Auto" },
  { value: "entertainment", ko: "엔터·콘텐츠", en: "Entertainment" },
  { value: "beauty", ko: "뷰티", en: "Beauty" },
  { value: "other", ko: "기타", en: "Other" },
];

const PLACEHOLDER_KO =
  "예) 강남·홍대 일대에서 2030 여성 타깃으로 신규 뷰티 브랜드 팝업스토어를 알리고 싶어요. 월 예산은 500만원 정도 생각하고 있어요.";
const PLACEHOLDER_EN =
  "e.g. Promote a new beauty brand pop-up around Gangnam/Hongdae targeting women in their 20s-30s. Monthly budget around 5M KRW.";

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

export default function RecommendAiFreetext({ locale, onConfirm }: Props) {
  const isKo = locale === "ko";
  const router = useRouter();
  const { isPro, loading: proLoading } = useIsPro();

  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    goal: "",
    target: "",
    budgetMan: "",
    region: "",
    industry: "",
  });

  const analyze = useCallback(async () => {
    if (text.trim().length < 5) {
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
      const res = await fetch("/api/recommend/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), locale }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        fields?: RecommendBriefFields;
        message?: string;
        error?: string;
      };
      if (res.status === 403) {
        // 서버 하드 게이트 — 비PRO
        setError(
          data.message ??
            (isKo
              ? "AI 자유입력은 PRO 전용 기능입니다."
              : "AI free-text is a PRO-only feature."),
        );
        return;
      }
      if (!res.ok || !data.ok || !data.fields) {
        setError(
          data.message ??
            (isKo ? "조건 분석에 실패했습니다." : "Could not analyze."),
        );
        return;
      }
      setDraft(fieldsToDraft(data.fields));
      setPhase("confirm");
    } catch {
      setError(isKo ? "요청에 실패했습니다." : "Request failed.");
    } finally {
      setParsing(false);
    }
  }, [text, locale, isKo]);

  const runRecommend = useCallback(() => {
    const budget = Math.round(Number(draft.budgetMan) || 0);
    if (
      !draft.goal ||
      !draft.target ||
      !draft.industry ||
      !draft.region.trim() ||
      budget <= 0
    ) {
      setError(
        isKo
          ? "비어 있는 조건을 모두 선택/입력해주세요."
          : "Please fill in all the highlighted fields.",
      );
      return;
    }
    const input: AiRecommendInput = {
      goal: draft.goal as GoalKey,
      target: draft.target as TargetKey,
      budgetMaxMan: budget,
      region: draft.region.trim(),
      industry: draft.industry as IndustryKey,
    };
    onConfirm(input);
  }, [draft, isKo, onConfirm]);

  // ── 비PRO: 업그레이드 CTA ──
  if (!proLoading && !isPro) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6 text-center dark:border-violet-500/30 dark:bg-violet-500/10">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15">
          <Lock className="h-5 w-5 text-violet-500" />
        </div>
        <p className="text-base font-bold text-gray-900 dark:text-white">
          {isKo ? "AI 자유입력은 PRO 전용이에요" : "AI free-text is PRO-only"}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-white/60">
          {isKo
            ? "문장으로 캠페인을 설명하면 AI가 조건을 추출해 매체를 추천합니다. 구조화 입력은 무료로 계속 사용할 수 있어요."
            : "Describe your campaign in plain language and let AI extract the brief. The structured form stays free."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600"
        >
          <Sparkles className="h-4 w-4" />
          {isKo ? "PRO로 업그레이드" : "Upgrade to PRO"}
        </button>
      </div>
    );
  }

  // ── 확인/수정 화면 ──
  if (phase === "confirm") {
    const selCls =
      "h-11 w-full rounded-xl border bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400/35 dark:bg-white/8 dark:text-white";
    const emptyRing = "border-amber-300 dark:border-amber-400/50";
    const filledRing = "border-gray-200 dark:border-white/10";
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-violet-500" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {isKo ? "AI가 추출한 조건" : "AI-extracted brief"}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-white/55">
          {isKo
            ? "확인 후 비어 있는 항목을 채우거나 수정하세요. 확인을 눌러야 추천이 실행됩니다."
            : "Review, fill any missing fields, then confirm to run the recommendation."}
        </p>

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
              {GOAL_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {isKo ? o.ko : o.en}
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
              {isKo ? "희망 지역" : "Region"}
            </span>
            <input
              type="text"
              value={draft.region}
              onChange={(e) =>
                setDraft((d) => ({ ...d, region: e.target.value }))
              }
              placeholder={isKo ? "예: 서울 강남" : "e.g. Seoul Gangnam"}
              className={cn(selCls, draft.region.trim() ? filledRing : emptyRing)}
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
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
          >
            <Sparkles className="h-4 w-4" />
            {isKo ? "이 조건으로 추천 실행" : "Run recommendation"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("input");
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

  // ── 자유텍스트 입력 화면 ──
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {isKo ? "캠페인을 문장으로 설명하세요" : "Describe your campaign"}
        </p>
        <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
          PRO
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder={isKo ? PLACEHOLDER_KO : PLACEHOLDER_EN}
        className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/35 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder-white/30"
      />
      {error ? <p className="text-xs font-medium text-rose-500">{error}</p> : null}
      <button
        type="button"
        onClick={analyze}
        disabled={parsing}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
      >
        {parsing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        {isKo ? "조건 분석" : "Analyze"}
      </button>
      <p className="text-[11px] text-gray-400 dark:text-white/40">
        {isKo
          ? "AI가 문장에서 목적·타깃·지역·예산·업종을 추출합니다. 추측하지 않으며, 빠진 항목은 다음 화면에서 직접 채웁니다."
          : "AI extracts goal, target, region, budget, and industry — it won't guess; you fill the rest next."}
      </p>
    </div>
  );
}
