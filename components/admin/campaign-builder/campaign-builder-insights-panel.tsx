"use client";

import { useMemo } from "react";
import type {
  CampaignBuilderPayload,
  CampaignInsightsOverride,
} from "@/lib/admin-campaign-builder/schemas";
import {
  applyInsightsOverride,
  buildCampaignBuilderInsights,
} from "@/lib/admin-campaign-builder/build-insights";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import { Button } from "@/components/ui/button";

type Props = {
  isKo: boolean;
  payload: CampaignBuilderPayload;
  digitalViews: PublicMediaView[];
  onChange: (next: CampaignBuilderPayload) => void;
};

export function CampaignBuilderInsightsPanel({
  isKo,
  payload,
  digitalViews,
  onChange,
}: Props) {
  const baseInsights = useMemo(
    () =>
      buildCampaignBuilderInsights(payload, {
        views: digitalViews,
        isKo,
      }),
    [payload, digitalViews, isKo],
  );

  const displayed = useMemo(
    () => applyInsightsOverride(baseInsights, payload.insightsOverride),
    [baseInsights, payload.insightsOverride],
  );

  function patchOverride(patch: Partial<CampaignInsightsOverride>) {
    onChange({
      ...payload,
      insightsOverride: {
        ...payload.insightsOverride,
        ...patch,
      },
    });
  }

  function resetOverride() {
    const next = { ...payload };
    delete next.insightsOverride;
    onChange(next);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">
          {isKo ? "운영 인사이트" : "Operational insights"}
        </h2>
        <Button type="button" size="sm" variant="secondary" onClick={resetOverride}>
          {isKo ? "초기화" : "Reset"}
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-2 text-sm font-semibold">
            {isKo ? "페이싱 플랜" : "Pacing plan"}
          </p>
          <textarea
            rows={4}
            value={displayed.pacingPlan
              .map((p) => `${p.label} (${p.sharePct}%): ${p.description}`)
              .join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n").filter(Boolean);
              patchOverride({
                pacingPlan: lines.map((line) => {
                  const m = line.match(/^(.+?)\s*\((\d+)%\):\s*(.+)$/);
                  if (m) {
                    return {
                      label: m[1]!.trim(),
                      sharePct: Number(m[2]),
                      description: m[3]!.trim(),
                    };
                  }
                  return {
                    label: line.slice(0, 40),
                    sharePct: 0,
                    description: line,
                  };
                }),
              });
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">
            {isKo ? "크리에이티브 방향" : "Creative directions"}
          </p>
          <textarea
            rows={3}
            value={displayed.creativeDirections.join("\n")}
            onChange={(e) =>
              patchOverride({
                creativeDirections: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">
            {isKo ? "운영 노트" : "Operational notes"}
          </p>
          <textarea
            rows={3}
            value={displayed.operationalNotes.join("\n")}
            onChange={(e) =>
              patchOverride({
                operationalNotes: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <p className="text-xs text-muted-foreground">{displayed.disclaimer}</p>
      </div>
    </section>
  );
}
