"use client";

import { PlannerProGate } from "@/components/planner/planner-neon-ui";
import { useIsPro } from "@/hooks/use-is-pro";
import MediaDetailPerformance from "@/components/media-detail-performance";
import { TrafficChartsLazy } from "@/components/media-detail/traffic-charts-lazy";
import { MediaAnalyticsReportSection } from "@/components/media-detail/media-analytics-report";
import { CompetitorOohSection } from "@/components/media-detail/data-fusion-panels";
import type { MediaAnalyticsReport } from "@/lib/media-report-analytics";
import type { AccessCheckResult } from "@/lib/report-access-shared";
import type { MediaPerformanceMetrics } from "@/lib/media-performance";
import type { StoredTrafficPattern } from "@/lib/media-traffic-estimate";
import type { DataSourceAttribution } from "@/lib/data-source-types";

type Props = {
  mediaType: string;
  region: string;
  stored: StoredTrafficPattern | null;
  fusedStored: StoredTrafficPattern | null;
  dailyFootfall: number | null;
  attributions?: DataSourceAttribution[];
  isKo: boolean;
  performanceMetrics: MediaPerformanceMetrics;
  analyticsReport: MediaAnalyticsReport;
  detailAccess: AccessCheckResult;
  competitorAccess: AccessCheckResult;
};

export function MediaDetailTrafficPanel({
  mediaType,
  region,
  stored,
  fusedStored,
  dailyFootfall,
  attributions,
  isKo,
  performanceMetrics,
  analyticsReport,
  detailAccess,
  competitorAccess,
}: Props) {
  const { isPro } = useIsPro();

  return (
    <div className="space-y-6">
      <TrafficChartsLazy
        mediaType={mediaType}
        region={region}
        stored={stored}
        fusedStored={fusedStored}
        dailyFootfall={dailyFootfall}
        attributions={attributions}
        isKo={isKo}
        chartHeightClass="h-80 sm:h-96"
        hourlyOnly={!isPro}
      />

      <PlannerProGate isPro={isPro} isKo={isKo}>
        <div className="space-y-6">
          <MediaDetailPerformance metrics={performanceMetrics} />
          <MediaAnalyticsReportSection
            report={analyticsReport}
            isKo={isKo}
            access={detailAccess}
          />
          <CompetitorOohSection
            report={analyticsReport}
            isKo={isKo}
            access={competitorAccess}
          />
        </div>
      </PlannerProGate>
    </div>
  );
}
