"use client";

import { useLocale, useTranslations } from "next-intl";
import { CaseStudyCard } from "@/components/cases/case-study-card";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

type Props = {
  items: PublicSuccessCaseListItem[];
  compact?: boolean;
};

export function SimilarCasesRow({ items, compact }: Props) {
  const t = useTranslations("cases");
  const locale = useLocale();
  const isKo = locale === "ko";

  if (items.length === 0) return null;

  return (
    <section className="border-t border-white/10 bg-[#0A0A0A] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
          [ {t("similarCasesTitle")} ]
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
          {isKo ? "비슷한 캠페인 사례" : "Related campaigns"}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <CaseStudyCard key={item.id} item={item} compact={compact} />
          ))}
        </div>
      </div>
    </section>
  );
}
