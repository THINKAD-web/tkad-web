"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { CaseStudyCard } from "@/components/cases/case-study-card";
import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

type Props = {
  cases: PublicSuccessCaseListItem[];
};

export function HomeSuccessCasesSection({ cases }: Props) {
  const t = useTranslations("cases");

  if (cases.length === 0) return null;

  return (
    <div className="mt-5 sm:mt-8 lg:mt-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#22d3ee]">
          [ {t("homeCasesKicker")} ]
        </p>
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-[#22d3ee]"
        >
          {t("homeCasesViewAll")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cases.map((item) => (
          <CaseStudyCard key={item.id} item={item} compact />
        ))}
      </div>
    </div>
  );
}
