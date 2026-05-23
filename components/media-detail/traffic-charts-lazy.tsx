"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const TrafficChartsInner = dynamic(
  () =>
    import("@/components/media-detail/traffic-charts").then((m) => ({
      default: m.TrafficCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/60 bg-muted/20">
        <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          // loading charts…
        </p>
      </div>
    ),
  },
);

export function TrafficChartsLazy(props: ComponentProps<typeof TrafficChartsInner>) {
  return <TrafficChartsInner {...props} />;
}
