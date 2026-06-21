"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

export type PlannerProposalNarrativeProps = {
  isKo: boolean;
  goal: PlannerCampaignGoal | null;
  regions: string[];
  categories: PlannerCategory[];
  ageKey: PlannerAgeKey;
  industryKey: PlannerIndustryKey | null;
  budgetMan: number;
  months: number;
  portfolio: MediaItem[];
};

export function PlannerProposalNarrative({
  goal,
  regions,
  categories,
  ageKey,
  industryKey,
  budgetMan,
  months,
  portfolio,
}: PlannerProposalNarrativeProps) {
  const t = useTranslations("planner");
  const locale = useLocale();
  const [sentences, setSentences] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchRef = useRef(0);

  const mediaIds = useMemo(
    () => portfolio.map((m) => m.id).join(","),
    [portfolio],
  );

  const depsKey = useMemo(
    () =>
      `${goal ?? ""}|${regions.join(",")}|${categories.join(",")}|${ageKey}|${industryKey}|${budgetMan}|${months}|${mediaIds}`,
    [
      goal,
      regions,
      categories,
      ageKey,
      industryKey,
      budgetMan,
      months,
      mediaIds,
    ],
  );

  useEffect(() => {
    if (portfolio.length === 0) {
      setSentences(null);
      return;
    }

    const id = ++fetchRef.current;
    setLoading(true);
    setSentences(null);

    void (async () => {
      try {
        const res = await fetch("/api/planner/proposal-narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal,
            regions,
            categories,
            ageKey,
            industryKey,
            budgetMan,
            months,
            mediaIds: portfolio.map((m) => m.id),
            locale,
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          claudeUsed?: boolean;
          sentences?: string[] | null;
        };
        if (id !== fetchRef.current) return;
        if (data.ok && data.claudeUsed && data.sentences?.length) {
          setSentences(data.sentences);
        } else {
          setSentences(null);
        }
      } catch {
        if (id !== fetchRef.current) return;
        setSentences(null);
      } finally {
        if (id === fetchRef.current) setLoading(false);
      }
    })();
  }, [depsKey, goal, regions, categories, ageKey, industryKey, budgetMan, months, portfolio, locale]);

  if (!loading && !sentences?.length) return null;

  return (
    <PlannerNeonCard className="border-violet-400/25 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 dark:text-violet-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <PlannerNeonLabel>{t("proposalNarrativeEyebrow")}</PlannerNeonLabel>
          <h3 className={cn("mt-2 text-base font-bold", plannerNeon.headline)}>
            {t("proposalNarrativeTitle")}
          </h3>
          {loading ? (
            <p
              className={cn("mt-3 text-sm", plannerNeon.subtext)}
              role="status"
              aria-live="polite"
            >
              {t("proposalNarrativeLoading")}
            </p>
          ) : (
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-foreground">
              {sentences?.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </PlannerNeonCard>
  );
}
