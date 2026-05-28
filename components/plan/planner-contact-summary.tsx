"use client";

import { useLocale } from "next-intl";
import type { PlanTransferData } from "@/lib/planner-contact-transfer";
import { formatPlanTransferBudget } from "@/lib/planner-contact-transfer";

type Props = {
  plan: PlanTransferData;
};

export function PlannerContactSummary({ plan }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";

  const title =
    plan.source === "ai_recommend"
      ? isKo
        ? "🤖 AI 추천 플랜"
        : "🤖 AI recommended plan"
      : plan.source === "integrated"
        ? isKo
          ? "📊 통합 플래너 플랜"
          : "📊 Integrated planner plan"
        : isKo
          ? "📊 플래너 추천 플랜"
          : "📊 Planner recommended plan";

  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
      <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </p>
      {plan.mediaNames.map((name, i) => (
        <p
          key={`${name}-${i}`}
          className="text-xs text-gray-600 dark:text-white/70"
        >
          {i + 1}. {name}
        </p>
      ))}
      <p className="mt-2 text-xs text-violet-600 dark:text-violet-400">
        {isKo ? "총 예산" : "Total budget"}:{" "}
        {formatPlanTransferBudget(plan.totalBudget, isKo)} ·{" "}
        {isKo ? "기간" : "Duration"}: {plan.duration}
        {isKo ? "개월" : " mo"}
      </p>
    </div>
  );
}
