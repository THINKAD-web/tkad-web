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
import {
  listBuilderKpiCardsForUi,
  type BuilderKpiCardId,
} from "@/lib/admin-campaign-builder/build-kpi-cards";
import { resolveBuilderSectionCopy } from "@/lib/admin-campaign-builder/resolve-builder-copy";
import { summarizeBuilderReport } from "@/lib/admin-campaign-builder/summary";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import { Button } from "@/components/ui/button";

type Props = {
  isKo: boolean;
  payload: CampaignBuilderPayload;
  digitalViews: PublicMediaView[];
  onChange: (next: CampaignBuilderPayload) => void;
};

const SECTION_TITLE_FIELDS = [
  { key: "digital" as const, labelKo: "디지털 섹션 제목", labelEn: "Digital section title" },
  { key: "ooh" as const, labelKo: "OOH 섹션 제목", labelEn: "OOH section title" },
  { key: "custom" as const, labelKo: "집행/커스텀 섹션 제목", labelEn: "Custom section title" },
  { key: "kpi" as const, labelKo: "KPI 섹션 제목", labelEn: "KPI section title" },
  { key: "donut" as const, labelKo: "예산 차트 섹션 제목", labelEn: "Budget chart title" },
  { key: "insights" as const, labelKo: "인사이트 섹션 제목", labelEn: "Insights section title" },
];

const INSIGHT_SUBTITLE_FIELDS = [
  {
    key: "pacing" as const,
    labelKo: "소진 페이스 소제목",
    labelEn: "Pacing subtitle",
  },
  {
    key: "creative" as const,
    labelKo: "소재 방향 소제목",
    labelEn: "Creative subtitle",
  },
  {
    key: "operational" as const,
    labelKo: "운영 메모 소제목",
    labelEn: "Operations subtitle",
  },
];

const SECTION_NOTICE_FIELDS = [
  {
    key: "digitalEstimateNotice" as const,
    labelKo: "디지털 견적 안내",
    labelEn: "Digital estimate notice",
    rows: 3,
  },
  {
    key: "oohSectionNotice" as const,
    labelKo: "OOH 섹션 안내 (선택)",
    labelEn: "OOH section notice (optional)",
    rows: 2,
  },
  {
    key: "executionNotice" as const,
    labelKo: "집행 섹션 안내",
    labelEn: "Execution section notice",
    rows: 2,
  },
  {
    key: "insightsHint" as const,
    labelKo: "인사이트 힌트",
    labelEn: "Insights hint",
    rows: 2,
  },
];

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

  const sectionCopy = useMemo(
    () =>
      resolveBuilderSectionCopy(
        payload.documentType,
        isKo,
        payload.insightsOverride,
      ),
    [payload.documentType, isKo, payload.insightsOverride],
  );

  const kpiRows = useMemo(() => {
    const catalogBySlug = new Map(
      digitalViews.map((view) => [
        view.slug,
        { nameKo: view.nameKo, platform: view.platform },
      ]),
    );
    const summary = summarizeBuilderReport(payload, catalogBySlug);
    return listBuilderKpiCardsForUi(payload, summary, isKo);
  }, [payload, digitalViews, isKo]);

  function patchOverride(patch: Partial<CampaignInsightsOverride>) {
    onChange({
      ...payload,
      insightsOverride: {
        ...payload.insightsOverride,
        ...patch,
      },
    });
  }

  function patchSectionTitle(
    key: keyof NonNullable<CampaignInsightsOverride["sectionTitles"]>,
    value: string,
  ) {
    patchOverride({
      sectionTitles: {
        ...payload.insightsOverride?.sectionTitles,
        [key]: value,
      },
    });
  }

  function patchSectionNotice(
    key: keyof NonNullable<CampaignInsightsOverride["sectionNotices"]>,
    value: string,
  ) {
    patchOverride({
      sectionNotices: {
        ...payload.insightsOverride?.sectionNotices,
        [key]: value,
      },
    });
  }

  function patchInsightSubtitle(
    key: keyof NonNullable<CampaignInsightsOverride["insightSubtitles"]>,
    value: string,
  ) {
    patchOverride({
      insightSubtitles: {
        ...payload.insightsOverride?.insightSubtitles,
        [key]: value,
      },
    });
  }

  function patchKpiCard(
    id: BuilderKpiCardId,
    patch: { labelOverride?: string; hidden?: boolean },
  ) {
    const existing = [...(payload.insightsOverride?.kpiCards ?? [])];
    const idx = existing.findIndex((entry) => entry.id === id);
    const merged = {
      ...(idx >= 0 ? existing[idx]! : { id }),
      ...patch,
    };

    const cleaned = {
      id: merged.id,
      ...(merged.labelOverride?.trim()
        ? { labelOverride: merged.labelOverride.trim() }
        : {}),
      ...(merged.hidden ? { hidden: true } : {}),
    };

    const hasOverride =
      cleaned.labelOverride != null || cleaned.hidden === true;

    if (idx >= 0) {
      if (hasOverride) existing[idx] = cleaned;
      else existing.splice(idx, 1);
    } else if (hasOverride) {
      existing.push(cleaned);
    }

    patchOverride({
      kpiCards: existing.length > 0 ? existing : undefined,
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
          {isKo ? "운영 인사이트 · 섹션 문구" : "Insights & section copy"}
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

        <div>
          <p className="mb-2 text-sm font-semibold">
            {isKo ? "Disclaimer" : "Disclaimer"}
          </p>
          <textarea
            rows={3}
            value={displayed.disclaimer}
            onChange={(e) => patchOverride({ disclaimer: e.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3 border-t border-border/60 pt-3">
          <p className="text-sm font-semibold">
            {isKo ? "KPI 카드" : "KPI cards"}
          </p>
          {kpiRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isKo
                ? "표시할 KPI 카드가 없습니다. 라인을 추가하면 카드가 생성됩니다."
                : "No KPI cards yet. Add lines to generate cards."}
            </p>
          ) : (
            kpiRows.map((row) => (
              <div
                key={row.id}
                data-testid={`builder-kpi-card-${row.id}`}
                className="rounded-lg border border-border/60 bg-background/60 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {row.id}
                  </span>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!row.hidden}
                      onChange={(e) =>
                        patchKpiCard(row.id, { hidden: !e.target.checked })
                      }
                    />
                    {isKo ? "노출" : "Visible"}
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <input
                    type="text"
                    value={row.labelOverride ?? ""}
                    placeholder={row.defaultLabel}
                    onChange={(e) =>
                      patchKpiCard(row.id, { labelOverride: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm tabular-nums">
                    <span className="mr-2 text-xs text-muted-foreground">
                      {isKo ? "값" : "Value"}
                    </span>
                    {row.value}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-sm font-semibold">
            {isKo ? "인사이트 소제목" : "Insight subtitles"}
          </p>
          {INSIGHT_SUBTITLE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-muted-foreground">
                {isKo ? field.labelKo : field.labelEn}
              </label>
              <input
                type="text"
                value={sectionCopy.insightSubtitles[field.key]}
                onChange={(e) => patchInsightSubtitle(field.key, e.target.value)}
                data-testid={`builder-insight-subtitle-${field.key}`}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-sm font-semibold">
            {isKo ? "섹션 제목" : "Section titles"}
          </p>
          {SECTION_TITLE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-muted-foreground">
                {isKo ? field.labelKo : field.labelEn}
              </label>
              <input
                type="text"
                value={sectionCopy.titles[field.key]}
                onChange={(e) => patchSectionTitle(field.key, e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-sm font-semibold">
            {isKo ? "섹션 안내 문구" : "Section notices"}
          </p>
          {SECTION_NOTICE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-muted-foreground">
                {isKo ? field.labelKo : field.labelEn}
              </label>
              <textarea
                rows={field.rows}
                value={sectionCopy.notices[field.key] ?? ""}
                onChange={(e) => patchSectionNotice(field.key, e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
