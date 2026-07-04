"use client";

import { useTranslations } from "next-intl";
import { MonitorPlay, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { PlannerCampaignGoalGrid } from "@/components/planner/planner-campaign-goal-grid";

type Props = {
  campaignGoal: PlannerCampaignGoal | null;
  onSelectGoal: (key: PlannerCampaignGoal) => void;
};

export default function PlannerCampaignStep1({
  campaignGoal,
  onSelectGoal,
}: Props) {
  const t = useTranslations("planner");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>Step 1 / Goal</PlannerNeonLabel>
          <h2
            className={cn(
              "mt-2 flex items-center gap-2 text-xl sm:text-2xl",
              plannerNeon.headline,
            )}
          >
            <Sparkles className="h-5 w-5 text-violet-400" />
            {t("step1Title")}
          </h2>
          <p className={cn("mt-2", plannerNeon.subtext)}>{t("step1Desc")}</p>
        </div>
        <div className="p-5 sm:p-6">
          <PlannerCampaignGoalGrid
            selected={campaignGoal}
            onSelect={onSelectGoal}
          />
        </div>
      </PlannerNeonCard>

      <aside
        className={cn(
          plannerNeon.card,
          "tkad-planner-step1-aside animate-fade-in-up overflow-hidden",
        )}
      >
        <div className="space-y-4 p-5">
          <p
            className={cn(
              "flex items-center gap-2",
              plannerNeon.label,
            )}
          >
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
            {t("step1VisualTitle")}
          </p>
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border transition-transform motion-safe:duration-300",
              campaignGoal
                ? "border-violet-400/50 motion-safe:scale-[1.01]"
                : "dark:border-white/10 border-gray-200",
            )}
          >
            <div className="tkad-planner-step1-preview-frame aspect-[2.35/1] w-full bg-gray-100 dark:bg-[#020202]/80">
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-6 sm:py-8">
                <div className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                  OOH
                </div>
                <p className="text-center text-sm font-bold text-foreground sm:text-base">
                  {t("step1VisualFrameLabel")}
                </p>
                <p className="max-w-[14rem] text-center text-xs leading-snug text-muted-foreground">
                  {t("step1VisualHint")}
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("step1VisualDesc")}
          </p>
        </div>
      </aside>
    </div>
  );
}
