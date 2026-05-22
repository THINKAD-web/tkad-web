"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check, Sparkles, TrendingUp } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import {
  recommendDigitalChannels,
  type ScoredDigitalChannel,
} from "@/lib/planner/recommend-digital";
import {
  selectIntegratedBudgetNum,
  useIntegratedPlannerStore,
} from "@/lib/planner/integrated-store";
import type { DigitalChannelId } from "@/lib/planner/digital-channels";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  portfolio: MediaItem[];
  isKo: boolean;
};

export function IntegratedDigitalRecommendationPanel({ portfolio, isKo }: Props) {
  const t = useTranslations("plannerIntegrated");
  const goal = useIntegratedPlannerStore((s) => s.campaignGoal);
  const regions = useIntegratedPlannerStore((s) => s.regions);
  const budgetMan = useIntegratedPlannerStore(selectIntegratedBudgetNum);
  const digitalBudgetPct = useIntegratedPlannerStore((s) => s.digitalBudgetPct);
  const setDigitalBudgetPct = useIntegratedPlannerStore(
    (s) => s.setDigitalBudgetPct,
  );
  const selectedIds = useIntegratedPlannerStore((s) => s.digitalChannelIds);
  const toggleChannel = useIntegratedPlannerStore((s) => s.toggleDigitalChannel);
  const setDigitalChannelIds = useIntegratedPlannerStore(
    (s) => s.setDigitalChannelIds,
  );

  const result = useMemo(
    () =>
      recommendDigitalChannels({
        goal,
        regions,
        portfolio,
        budgetMan,
        digitalBudgetPct,
      }),
    [goal, regions, portfolio, budgetMan, digitalBudgetPct],
  );

  const isSelected = (id: DigitalChannelId) => selectedIds.includes(id);

  const handleSelectAll = () => {
    setDigitalChannelIds(result.channels.map((c) => c.channel.id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-400/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          <div>
            <p className="text-sm font-bold text-foreground dark:text-white">
              {isKo ? result.synergyMessageKo : result.synergyMessageEn}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("synergyHint")}
            </p>
          </div>
        </div>
      </div>

      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>{t("digitalBudgetSplit")}</PlannerNeonLabel>
          <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
            {t("digitalBudgetSplitDesc")}
          </p>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={digitalBudgetPct}
            onChange={(e) => setDigitalBudgetPct(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-sm font-semibold">
            <span>
              OOH {result.oohBudgetPct}% (
              {Math.round(budgetMan * (result.oohBudgetPct / 100)).toLocaleString()}
              {isKo ? "만원" : "M KRW"})
            </span>
            <span className="text-cyan-400">
              {t("digitalLabel")} {result.digitalBudgetPct}% (
              {Math.round(budgetMan * (result.digitalBudgetPct / 100)).toLocaleString()}
              {isKo ? "만원" : "M KRW"})
            </span>
          </div>
        </div>
      </PlannerNeonCard>

      <PlannerNeonCard className="border-violet-400/20">
        <div className="flex flex-col gap-3 border-b dark:border-white/10 border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="space-y-1">
            <PlannerNeonLabel>{t("digitalRecommendEyebrow")}</PlannerNeonLabel>
            <h3 className={cn("text-lg font-bold", plannerNeon.headline)}>
              {t("digitalRecommendTitle")}
            </h3>
            <p className={cn("text-sm", plannerNeon.subtext)}>
              {t("digitalRecommendDesc", {
                region: isKo
                  ? result.primaryRegionLabelKo
                  : result.primaryRegionLabelEn,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className={cn(
              plannerNeon.selectChip,
              plannerNeon.selectChipIdle,
              "shrink-0 self-start",
            )}
          >
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
            {t("selectAllDigital")}
          </button>
        </div>

        <ul className="divide-y dark:divide-white/8 divide-gray-100">
          {result.channels.map((row: ScoredDigitalChannel) => {
            const active = isSelected(row.channel.id);
            return (
              <li key={row.channel.id}>
                <button
                  type="button"
                  onClick={() => toggleChannel(row.channel.id)}
                  className={cn(
                    "flex w-full items-start gap-4 px-5 py-4 text-left transition-colors sm:px-6",
                    active
                      ? "bg-violet-500/8 dark:bg-violet-500/12"
                      : "hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                      active
                        ? "border-violet-500 bg-violet-500 text-white"
                        : "border-border bg-card",
                    )}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground dark:text-white">
                        {isKo ? row.channel.nameKo : row.channel.nameEn}
                      </span>
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
                        {isKo ? row.channel.targetingKo : row.channel.targetingEn}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {isKo ? row.reasonKo : row.reasonEn}
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-violet-600 dark:text-violet-300">
                      {t("channelBudgetPct", { pct: row.budgetPct })}
                      {" · "}
                      CPC ₩{row.channel.avgCpcWon.toLocaleString()}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PlannerNeonCard>
    </div>
  );
}
