"use client";

import { useTranslations } from "next-intl";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type {
  PlannerConversionChannel,
  PlannerGoalFollowUp,
} from "@/lib/planner/goal-follow-up";
import {
  CONVERSION_KPI_PRESETS,
  isConversionKpiPreset,
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
  isKo: boolean;
  /** 아코디언 안에 넣을 때 외곽 카드·제목 생략 */
  embedded?: boolean;
};

const LAUNCH_WEEKS = [2, 4, 8] as const;
const EVENT_DAYS = [3, 7, 14] as const;
const CONVERSION_CHANNELS: PlannerConversionChannel[] = [
  "store",
  "online",
  "both",
];

export function PlannerGoalFollowUpPanel({
  goal,
  followUp,
  onChange,
  embedded = false,
}: Props) {
  const t = useTranslations("planner");

  if (!goal) return null;

  const chip = (active: boolean) =>
    cn(
      plannerNeon.selectChip,
      "touch-manipulation min-h-[2.75rem]",
      active ? plannerNeon.selectChipActive : plannerNeon.selectChipIdle,
    );

  const kpiValue = followUp.conversionKpi ?? "";
  const kpiIsPreset = isConversionKpiPreset(kpiValue);
  const kpiCustom = kpiIsPreset ? "" : kpiValue;
  const referenceNote = followUp.goalReferenceNote ?? "";

  const body = (
    <div className={cn("space-y-5", embedded ? "p-4 sm:p-5" : "p-5 sm:p-6")}>
      {goal === "brand" || goal === "local" ? (
        <div>
          <PlannerNeonLabel className="mb-2 block">
            {t("followUpConversionKpi")}
          </PlannerNeonLabel>
          <p className={cn("mb-2 text-xs", plannerNeon.subtext)}>
            {t("followUpConversionKpiHint")}
          </p>
          <input
            type="text"
            value={referenceNote}
            onChange={(e) =>
              onChange({ goalReferenceNote: e.target.value || null })
            }
            placeholder={t("followUpConversionKpiPh")}
            className="w-full rounded-xl border dark:border-white/10 border-gray-200 bg-transparent px-3 py-2.5 text-sm touch-manipulation"
          />
        </div>
      ) : null}

      {goal === "launch" ? (
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
            <p className={cn("mb-2 text-xs", plannerNeon.subtext)}>
              {t("followUpConversionChannelHint")}
            </p>
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
            <p className={cn("mb-2 text-xs", plannerNeon.subtext)}>
              {t("followUpConversionKpiHint")}
            </p>
            <div className="flex flex-wrap gap-2">
              {CONVERSION_KPI_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ conversionKpi: preset })}
                  className={chip(kpiValue === preset)}
                >
                  {t(`followUpKpi_${preset}`)}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={kpiCustom}
              onChange={(e) =>
                onChange({ conversionKpi: e.target.value || null })
              }
              placeholder={t("followUpConversionKpiPh")}
              className="mt-2 w-full rounded-xl border dark:border-white/10 border-gray-200 bg-transparent px-3 py-2.5 text-sm touch-manipulation"
            />
          </div>
        </>
      ) : null}
    </div>
  );

  if (embedded) return body;

  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>{t("followUpTitle")}</PlannerNeonLabel>
        <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
          {t("followUpDesc")}
        </p>
      </div>
      {body}
    </PlannerNeonCard>
  );
}
