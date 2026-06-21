"use client";

import { useTranslations } from "next-intl";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type {
  PlannerConversionChannel,
  PlannerGoalFollowUp,
  PlannerLaunchTiming,
} from "@/lib/planner/goal-follow-up";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  goal: PlannerCampaignGoal | null;
  followUp: PlannerGoalFollowUp;
  onChange: (patch: Partial<PlannerGoalFollowUp>) => void;
};

const LAUNCH_WEEKS = [2, 4, 8] as const;
const LOCAL_RADIUS = [1, 3, 5] as const;
const EVENT_DAYS = [3, 7, 14] as const;
const LAUNCH_TIMING: PlannerLaunchTiming[] = ["asap", "next_month", "season"];
const CONVERSION_CHANNELS: PlannerConversionChannel[] = [
  "store",
  "online",
  "both",
];

export function PlannerGoalFollowUpPanel({ goal, followUp, onChange }: Props) {
  const t = useTranslations("planner");

  if (!goal || goal === "brand") return null;

  const chip = (active: boolean) =>
    cn(
      plannerNeon.selectChip,
      "touch-manipulation min-h-[2.75rem]",
      active ? plannerNeon.selectChipActive : plannerNeon.selectChipIdle,
    );

  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>{t("followUpTitle")}</PlannerNeonLabel>
        <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
          {t("followUpDesc")}
        </p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        {goal === "launch" ? (
          <>
            <div>
              <PlannerNeonLabel className="mb-2 block">
                {t("followUpLaunchWeeks")}
              </PlannerNeonLabel>
              <div className="flex flex-wrap gap-2">
                {LAUNCH_WEEKS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onChange({ launchFocusWeeks: w })}
                    className={chip(followUp.launchFocusWeeks === w)}
                  >
                    {t("followUpWeeks", { n: w })}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <PlannerNeonLabel className="mb-2 block">
                {t("followUpLaunchTiming")}
              </PlannerNeonLabel>
              <div className="flex flex-wrap gap-2">
                {LAUNCH_TIMING.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => onChange({ launchTiming: k })}
                    className={chip(followUp.launchTiming === k)}
                  >
                    {t(`followUpTiming_${k}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {goal === "local" ? (
          <>
            <div>
              <PlannerNeonLabel className="mb-2 block">
                {t("followUpLocalRadius")}
              </PlannerNeonLabel>
              <div className="flex flex-wrap gap-2">
                {LOCAL_RADIUS.map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => onChange({ localRadiusKm: km })}
                    className={chip(followUp.localRadiusKm === km)}
                  >
                    {t("followUpKm", { n: km })}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <PlannerNeonLabel className="mb-2 block">
                {t("followUpLocalTradeArea")}
              </PlannerNeonLabel>
              <input
                type="text"
                value={followUp.localTradeArea ?? ""}
                onChange={(e) =>
                  onChange({
                    localTradeArea: e.target.value || null,
                  })
                }
                placeholder={t("followUpLocalTradeAreaPh")}
                className="w-full rounded-xl border dark:border-white/10 border-gray-200 bg-transparent px-3 py-2.5 text-sm touch-manipulation"
              />
            </div>
          </>
        ) : null}

        {goal === "event" ? (
          <div>
            <PlannerNeonLabel className="mb-2 block">
              {t("followUpEventDays")}
            </PlannerNeonLabel>
            <div className="flex flex-wrap gap-2">
              {EVENT_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange({ eventDurationDays: d })}
                  className={chip(followUp.eventDurationDays === d)}
                >
                  {t("followUpDays", { n: d })}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {goal === "sales" ? (
          <>
            <div>
              <PlannerNeonLabel className="mb-2 block">
                {t("followUpConversionChannel")}
              </PlannerNeonLabel>
              <div className="flex flex-wrap gap-2">
                {CONVERSION_CHANNELS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => onChange({ conversionChannel: ch })}
                    className={chip(followUp.conversionChannel === ch)}
                  >
                    {t(`followUpChannel_${ch}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <PlannerNeonLabel className="mb-2 block">
                {t("followUpConversionKpi")}
              </PlannerNeonLabel>
              <input
                type="text"
                value={followUp.conversionKpi ?? ""}
                onChange={(e) =>
                  onChange({ conversionKpi: e.target.value || null })
                }
                placeholder={t("followUpConversionKpiPh")}
                className="w-full rounded-xl border dark:border-white/10 border-gray-200 bg-transparent px-3 py-2.5 text-sm touch-manipulation"
              />
            </div>
          </>
        ) : null}
      </div>
    </PlannerNeonCard>
  );
}
