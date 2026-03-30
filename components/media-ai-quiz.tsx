"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type {
  AiRecommendInput,
  Industry,
  TargetAudience,
} from "@/lib/ai-media-recommend";

export type QuizIndustryKey =
  | "food"
  | "retail"
  | "entertainment"
  | "corp"
  | "other";
export type QuizAudienceKey = "youth" | "mid" | "senior" | "all";
export type QuizBudgetKey = "lte100" | "100to500" | "gte500" | "unknown";
export type QuizAreaKey = "seoul" | "capital" | "national";
export type QuizSeoulDistrictKey =
  | "all"
  | "gangnam"
  | "hongdae"
  | "myeongdong"
  | "yeouido"
  | "jamsil"
  | "jongno";

type Step = 1 | 2 | 3 | 4 | 5;

type Props = {
  locale: string;
  onComplete: (input: AiRecommendInput) => void;
};

function mapIndustry(k: QuizIndustryKey): Industry {
  switch (k) {
    case "food":
      return "fmcg";
    case "retail":
      return "retail";
    case "entertainment":
      return "entertainment";
    case "corp":
      return "fintech";
    default:
      return "other";
  }
}

function mapAudience(k: QuizAudienceKey): TargetAudience {
  switch (k) {
    case "youth":
      return "genz";
    case "mid":
      return "millennial";
    case "senior":
      return "family";
    default:
      return "mass";
  }
}

function mapBudget(k: QuizBudgetKey): number {
  switch (k) {
    case "lte100":
      return 100;
    case "100to500":
      return 500;
    case "gte500":
      return 0;
    default:
      return 0;
  }
}

function seoulDistrictKeywords(k: QuizSeoulDistrictKey): string[] | null {
  if (k === "all") return null;
  const table: Record<Exclude<QuizSeoulDistrictKey, "all">, string[]> = {
    gangnam: ["강남"],
    hongdae: ["홍대"],
    myeongdong: ["명동"],
    yeouido: ["여의도"],
    jamsil: ["잠실"],
    jongno: ["종로"],
  };
  return table[k];
}

export default function MediaAiQuiz({ locale, onComplete }: Props) {
  const t = useTranslations();
  const isKo = locale === "ko";
  const [step, setStep] = useState<Step>(1);

  const totalSteps = 5;
  const progress = step / totalSteps;

  const [industry, setIndustry] = useState<QuizIndustryKey | null>(null);
  const [audience, setAudience] = useState<QuizAudienceKey | null>(null);
  const [budget, setBudget] = useState<QuizBudgetKey | null>(null);

  const pickIndustry = (k: QuizIndustryKey) => {
    setIndustry(k);
    setStep(2);
  };
  const pickAudience = (k: QuizAudienceKey) => {
    setAudience(k);
    setStep(3);
  };
  const pickBudget = (k: QuizBudgetKey) => {
    setBudget(k);
    setStep(4);
  };
  const pickArea = (k: QuizAreaKey) => {
    if (k === "seoul") {
      setStep(5);
      return;
    }
    if (!industry || !audience || !budget) return;
    const input: AiRecommendInput = {
      goal: "awareness",
      industry: mapIndustry(industry),
      target: mapAudience(audience),
      budgetMaxMan: mapBudget(budget),
      region: k === "capital" ? "capital" : "all",
      locationKeywords: null,
    };
    onComplete(input);
  };

  const pickSeoulDistrict = (k: QuizSeoulDistrictKey) => {
    if (!industry || !audience || !budget) return;
    const input: AiRecommendInput = {
      goal: "awareness",
      industry: mapIndustry(industry),
      target: mapAudience(audience),
      budgetMaxMan: mapBudget(budget),
      region: "seoul",
      locationKeywords: seoulDistrictKeywords(k),
    };
    onComplete(input);
  };

  const title = (() => {
    if (step === 1) return t("media.ai.quiz.step1Title");
    if (step === 2) return t("media.ai.quiz.step2Title");
    if (step === 3) return t("media.ai.quiz.step3Title");
    if (step === 4) return t("media.ai.quiz.step4Title");
    return t("media.ai.quiz.step5Title");
  })();

  const subtitle = t("media.ai.quiz.subtitle");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_#0f172a_55%,_#020617_100%)] text-white">
      <div className="border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/90">
            AI
          </p>
          <p className="text-xs text-white/60">{subtitle}</p>
        </div>
        <div className="mx-auto mt-3 h-1.5 max-w-lg overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-amber-300 transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-extrabold leading-snug sm:text-2xl">
              {title}
            </h2>
            <p className="mt-2 text-sm text-white/55">
              {t("media.ai.quiz.hintTap")}
            </p>
          </div>

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <QuizCard
                emoji="🍽️"
                label={t("media.ai.quiz.industryFood")}
                onClick={() => pickIndustry("food")}
              />
              <QuizCard
                emoji="🛍️"
                label={t("media.ai.quiz.industryRetail")}
                onClick={() => pickIndustry("retail")}
              />
              <QuizCard
                emoji="🎮"
                label={t("media.ai.quiz.industryEnt")}
                onClick={() => pickIndustry("entertainment")}
              />
              <QuizCard
                emoji="🏢"
                label={t("media.ai.quiz.industryCorp")}
                onClick={() => pickIndustry("corp")}
              />
              <QuizCard
                emoji="✨"
                label={t("media.ai.quiz.industryOther")}
                className="sm:col-span-2"
                onClick={() => pickIndustry("other")}
              />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <QuizCard
                emoji="👩‍🎓"
                label={t("media.ai.quiz.audienceYouth")}
                onClick={() => pickAudience("youth")}
              />
              <QuizCard
                emoji="👨‍💼"
                label={t("media.ai.quiz.audienceMid")}
                onClick={() => pickAudience("mid")}
              />
              <QuizCard
                emoji="👴"
                label={t("media.ai.quiz.audienceSenior")}
                onClick={() => pickAudience("senior")}
              />
              <QuizCard
                emoji="👨‍👩‍👧‍👦"
                label={t("media.ai.quiz.audienceAll")}
                onClick={() => pickAudience("all")}
              />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <QuizCard
                emoji="💵"
                label={t("media.ai.quiz.budgetLte100")}
                onClick={() => pickBudget("lte100")}
              />
              <QuizCard
                emoji="💰"
                label={t("media.ai.quiz.budget100to500")}
                onClick={() => pickBudget("100to500")}
              />
              <QuizCard
                emoji="💎"
                label={t("media.ai.quiz.budgetGte500")}
                onClick={() => pickBudget("gte500")}
              />
              <QuizCard
                emoji="🤷"
                label={t("media.ai.quiz.budgetUnknown")}
                onClick={() => pickBudget("unknown")}
              />
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3">
              <QuizCard
                emoji="🌆"
                label={t("media.ai.quiz.areaSeoul")}
                className="py-5"
                onClick={() => pickArea("seoul")}
              />
              <QuizCard
                emoji="🛣️"
                label={t("media.ai.quiz.areaCapital")}
                className="py-5"
                onClick={() => pickArea("capital")}
              />
              <QuizCard
                emoji="🇰🇷"
                label={t("media.ai.quiz.areaNational")}
                className="py-5"
                onClick={() => pickArea("national")}
              />
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <QuizCard
                emoji="📍"
                label={t("media.ai.quiz.seoulAll")}
                onClick={() => pickSeoulDistrict("all")}
              />
              <QuizCard
                emoji="✨"
                label={t("media.ai.quiz.seoulGangnam")}
                onClick={() => pickSeoulDistrict("gangnam")}
              />
              <QuizCard
                emoji="🎸"
                label={t("media.ai.quiz.seoulHongdae")}
                onClick={() => pickSeoulDistrict("hongdae")}
              />
              <QuizCard
                emoji="🛍️"
                label={t("media.ai.quiz.seoulMyeongdong")}
                onClick={() => pickSeoulDistrict("myeongdong")}
              />
              <QuizCard
                emoji="🏙️"
                label={t("media.ai.quiz.seoulYeouido")}
                onClick={() => pickSeoulDistrict("yeouido")}
              />
              <QuizCard
                emoji="⚾"
                label={t("media.ai.quiz.seoulJamsil")}
                onClick={() => pickSeoulDistrict("jamsil")}
              />
              <QuizCard
                emoji="🏛️"
                label={t("media.ai.quiz.seoulJongno")}
                onClick={() => pickSeoulDistrict("jongno")}
              />
            </div>
          )}
        </div>
      </div>

      {step > 1 && (
        <div className="border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => {
              if (step === 5) {
                setStep(4);
                return;
              }
              setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
            }}
            className="mx-auto block text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            {isKo ? "이전 단계" : "Back"}
          </button>
        </div>
      )}
    </div>
  );
}

function QuizCard({
  emoji,
  label,
  onClick,
  className,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-left shadow-lg backdrop-blur-sm transition hover:border-gold/50 hover:bg-white/10 active:scale-[0.98]",
        className,
      )}
    >
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="text-sm font-bold leading-snug">{label}</span>
    </button>
  );
}
