"use client";

import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { cn } from "@/lib/utils";
import {
  CASE_BUDGET_TAGS,
  CASE_INDUSTRY_TAGS,
  CASE_MEDIA_TAGS,
  CASE_REGION_TAGS,
  type CaseBudgetTag,
  type CaseFilterState,
  type CaseIndustryTag,
  type CaseMediaTag,
  type CaseRegionTag,
} from "@/lib/success-case-hub";

type Props = {
  filters: CaseFilterState;
  onChange: (next: CaseFilterState) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onReset: () => void;
  resultCount: number;
};

function toggleSet<T extends string>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-all",
        active
          ? "border-[#22d3ee]/50 bg-[#22d3ee]/15 text-[#22d3ee] shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          : "border-white/12 bg-white/5 text-white/65 hover:border-white/25 hover:bg-white/10 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function FilterGroup<T extends string>({
  title,
  values,
  active,
  label,
  onToggle,
}: {
  title: string;
  values: readonly T[];
  active: Set<T>;
  label: (v: T) => string;
  onToggle: (v: T) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#a855f7]">
        [ {title} ]
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((v) => (
          <FilterChip
            key={v}
            active={active.has(v)}
            label={label(v)}
            onClick={() => onToggle(v)}
          />
        ))}
      </div>
    </div>
  );
}

export function CasesFilterHub({
  filters,
  onChange,
  query,
  onQueryChange,
  onReset,
  resultCount,
}: Props) {
  const t = useTranslations("cases");

  const industryLabel = (v: CaseIndustryTag) => {
    const map: Record<CaseIndustryTag, string> = {
      beauty: t("hubIndustryBeauty"),
      fashion: t("hubIndustryFashion"),
      fnb: t("hubIndustryFnb"),
      tech: t("hubIndustryTech"),
      finance: t("hubIndustryFinance"),
      entertainment: t("hubIndustryEntertainment"),
      realestate: t("hubIndustryRealestate"),
    };
    return map[v];
  };

  const mediaLabel = (v: CaseMediaTag) => {
    const map: Record<CaseMediaTag, string> = {
      billboard: t("hubMediaBillboard"),
      subway: t("hubMediaSubway"),
      bus: t("hubMediaBus"),
      dooh: t("hubMediaDooh"),
    };
    return map[v];
  };

  const regionLabel = (v: CaseRegionTag) => {
    const map: Record<CaseRegionTag, string> = {
      gangnam: t("hubRegionGangnam"),
      hongdae: t("hubRegionHongdae"),
      seongsu: t("hubRegionSeongsu"),
      urban: t("hubRegionUrban"),
      nationwide: t("hubRegionNationwide"),
    };
    return map[v];
  };

  const budgetLabel = (v: CaseBudgetTag) => {
    const map: Record<CaseBudgetTag, string> = {
      small: t("hubBudgetSmall"),
      medium: t("hubBudgetMedium"),
      large: t("hubBudgetLarge"),
    };
    return map[v];
  };

  return (
    <div className="mb-10 space-y-5 rounded-[24px] border border-white/12 bg-black/40 p-5 backdrop-blur sm:p-6">
      <FilterGroup
        title={t("filterIndustry")}
        values={CASE_INDUSTRY_TAGS}
        active={filters.industries}
        label={industryLabel}
        onToggle={(v) =>
          onChange({
            ...filters,
            industries: toggleSet(filters.industries, v),
          })
        }
      />
      <FilterGroup
        title={t("filterMediaType")}
        values={CASE_MEDIA_TAGS}
        active={filters.mediaTypes}
        label={mediaLabel}
        onToggle={(v) =>
          onChange({
            ...filters,
            mediaTypes: toggleSet(filters.mediaTypes, v),
          })
        }
      />
      <FilterGroup
        title={t("filterRegion")}
        values={CASE_REGION_TAGS}
        active={filters.regions}
        label={regionLabel}
        onToggle={(v) =>
          onChange({
            ...filters,
            regions: toggleSet(filters.regions, v),
          })
        }
      />
      <FilterGroup
        title={t("filterScale")}
        values={CASE_BUDGET_TAGS}
        active={filters.budgets}
        label={budgetLabel}
        onToggle={(v) =>
          onChange({
            ...filters,
            budgets: toggleSet(filters.budgets, v),
          })
        }
      />

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 w-full rounded-2xl border border-white/12 bg-white/5 px-4 font-mono text-sm text-white placeholder:text-white/40 focus:border-[#22d3ee]/40 focus:outline-none sm:max-w-md"
          aria-label={t("searchPlaceholder")}
        />
        <div className="flex items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50">
            {`// `}
            {t("resultsCount", { count: resultCount })}
          </p>
          <BtnBlock variant="secondary" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t("resetFilters")}
          </BtnBlock>
        </div>
      </div>
    </div>
  );
}
