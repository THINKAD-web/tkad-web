"use client";

import { useMemo } from "react";
import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { buildPlannerPremiumInsights } from "@/lib/planner-report-insights";
import { PlannerPremiumInsightsPanel } from "@/components/planner/planner-premium-insights";
import { useReportAccess } from "@/hooks/use-report-access";

type Props = {
  isKo: boolean;
  portfolio: MediaItem[];
  budgetMan: number;
  months: number;
  regionsText: string;
  goal: PlannerCampaignGoal | null;
  industryText?: string;
};

export function PlannerReportPremiumBlock(props: Props) {
  const { access, loading } = useReportAccess("simulation_full");

  const insights = useMemo(
    () =>
      buildPlannerPremiumInsights({
        portfolio: props.portfolio,
        budgetMan: props.budgetMan,
        months: props.months,
        regionsText: props.regionsText,
        goal: props.goal,
        industryText: props.industryText,
      }),
    [
      props.portfolio,
      props.budgetMan,
      props.months,
      props.regionsText,
      props.goal,
      props.industryText,
    ],
  );

  if (loading || !insights) return null;

  return (
    <PlannerPremiumInsightsPanel
      insights={insights}
      isKo={props.isKo}
      access={access}
    />
  );
}
