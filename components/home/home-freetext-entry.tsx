"use client";

import { useCallback, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FreetextExampleChips } from "@/components/planner/freetext-example-chips";
import {
  FREETEXT_BRIEF_MAX_CHARS,
  buildPlannerBriefPath,
  isValidFreetextBrief,
} from "@/lib/planner/freetext-brief-url";
import { cn } from "@/lib/utils";

const PLACEHOLDER_KO =
  '예) "강남 2030 브랜딩 3000만원" — 지역·타깃·목표·예산';
const PLACEHOLDER_EN =
  'e.g. "Gangnam Gen Z branding 30M KRW" — region, audience, goal, budget';

export function HomeFreetextEntry() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const [text, setText] = useState("");

  const canSubmit = isValidFreetextBrief(text);

  const goPlanner = useCallback(() => {
    const path = buildPlannerBriefPath(text);
    if (!path) return;
    router.push(path);
  }, [router, text]);

  return (
    <section
      className="px-4 pb-2 md:px-6 md:pb-3 lg:px-8"
      aria-labelledby="home-freetext-heading"
    >
      <div className="mx-auto max-w-5xl rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.06] via-white to-cyan-500/[0.05] p-4 shadow-sm ring-1 ring-black/5 dark:from-violet-500/10 dark:via-white/[0.03] dark:to-cyan-500/5 dark:ring-white/10 md:rounded-3xl md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-200">
                {isKo ? "무료 · 규칙" : "Free · Rules"}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {isKo ? "규칙 분석 · 0토큰" : "Rule-based · 0 tokens"}
              </span>
            </div>
            <h2
              id="home-freetext-heading"
              className="mt-2 flex items-center gap-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-white md:text-xl"
            >
              <Sparkles
                className="h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400"
                aria-hidden
              />
              {isKo ? "AI 자연어 입력" : "AI natural language"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-white/65">
              {isKo
                ? "지역·타깃·목표·예산을 자연어로 입력하면 AI 플래너가 맞춤 매체를 추천합니다. 매체명 검색이 아닙니다."
                : "Enter region, audience, goal, and budget in plain language — not a media name search."}
            </p>
          </div>
          <Link
            href="/media"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/12 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            {isKo ? "매체명 검색" : "Search media"}
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <label htmlFor="home-freetext-input" className="sr-only">
            {isKo ? "캠페인 조건" : "Campaign brief"}
          </label>
          <textarea
            id="home-freetext-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isKo ? PLACEHOLDER_KO : PLACEHOLDER_EN}
            rows={2}
            maxLength={FREETEXT_BRIEF_MAX_CHARS}
            className={cn(
              "w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed",
              "border-gray-200 bg-white dark:border-white/12 dark:bg-black/25",
              "focus:outline-none focus:ring-2 focus:ring-violet-400/40",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && canSubmit) {
                e.preventDefault();
                goPlanner();
              }
            }}
          />

          <FreetextExampleChips
            isKo={isKo}
            onSelect={(example) => setText(example)}
          />

          <button
            type="button"
            onClick={goPlanner}
            disabled={!canSubmit}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-opacity sm:w-auto",
              "bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-95",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {isKo ? "플래닝 시작" : "Start planning"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
