"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { accentTag } from "@/lib/render-accent-title";
import {
  INDUSTRY_BUDGET_SESSION_KEY,
  filterMediaByBudgetMan,
  type IndustrySlug,
} from "@/lib/industry-landing";

type PriceRef = { id: string; price: number };

type Props = {
  slug: IndustrySlug;
  priceRefs: PriceRef[];
};

const BUDGET_STEPS_MAN = [100, 300, 500, 1000, 2000, 5000] as const;

export function IndustryBudgetCalculator({ slug, priceRefs }: Props) {
  const t = useTranslations(`industryPage.slugs.${slug}`);
  const tc = useTranslations("industryPage.common");
  const locale = useLocale();
  const isKo = locale === "ko";
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(2);
  const budgetMan = BUDGET_STEPS_MAN[stepIdx] ?? 500;

  const matchCount = useMemo(() => {
    return filterMediaByBudgetMan(
      priceRefs.map((r) => ({ id: r.id, price: r.price })),
      budgetMan,
    ).length;
  }, [budgetMan, priceRefs]);

  function goToMedia() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(INDUSTRY_BUDGET_SESSION_KEY, String(budgetMan));
    }
    router.push("/media");
  }

  const formatted = isKo
    ? `${budgetMan.toLocaleString("ko-KR")}만원`
    : `₩${(budgetMan * 10_000).toLocaleString("en-US")}`;

  return (
    <NeonSection className="pt-10 pb-12 sm:pt-16 sm:pb-20">
      <NeonSectionHead
        number="03"
        kicker={t("budgetKicker")}
        title={t.rich("budgetTitle", { accent: accentTag })}
        meta={t("budgetMeta")}
      />
      <div className="mx-auto mt-8 max-w-2xl rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 backdrop-blur tkad-neon-border sm:p-8">
        <p className="text-center text-sm dark:text-white text-gray-700">{t("budgetLead")}</p>
        <p className="mt-4 text-center font-mono text-2xl font-black tabular-nums dark:text-white text-gray-900">
          {formatted}
          <span className="mt-1 block text-xs font-semibold text-cyan-300/80">
            {tc("budgetPerMonth")}
          </span>
        </p>
        <input
          type="range"
          min={0}
          max={BUDGET_STEPS_MAN.length - 1}
          step={1}
          value={stepIdx}
          onChange={(e) => setStepIdx(Number(e.target.value))}
          className="mt-6 w-full accent-cyan-400"
          aria-label={t("budgetAria")}
        />
        <div className="mt-2 flex justify-between font-mono text-[10px] dark:text-white text-gray-400">
          <span>100{isKo ? "만" : "M"}</span>
          <span>5,000{isKo ? "만" : "M"}</span>
        </div>
        <p className="mt-6 text-center text-sm dark:text-white text-gray-600">
          {tc("budgetMatchCount", { count: matchCount })}
        </p>
        <button
          type="button"
          onClick={goToMedia}
          className="tkad-neon-cta-clean mx-auto mt-6 flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-[22px] px-8 text-sm font-black dark:text-white text-gray-900 transition-transform hover:-translate-y-1 sm:text-base"
        >
          {t("budgetCta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </NeonSection>
  );
}
