"use client";

import { useMemo, useState } from "react";
import type { CampaignBuilderPayload, DigitalCampaignLine } from "@/lib/admin-campaign-builder/schemas";
import { filterOnlineCatalog } from "@/lib/admin-campaign-builder/filter-online-catalog";
import {
  aggregatePerformanceEstimates,
  totalBudgetWon,
} from "@/lib/admin-campaign-builder/aggregate-kpis";
import { formatKpiRange } from "@/lib/admin-campaign-builder/format";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import {
  estimatePerformance,
  type OnlineSpecRates,
} from "@/lib/pricing/online-performance-estimate";
import { PriceDisplay } from "@/components/admin/campaign-builder/price-display";
import { Button } from "@/components/ui/button";
import { CATALOG_ESTIMATION_NOTICE } from "@/lib/admin-campaign-builder/copy-ko";

function toOnlineSpecRates(view: PublicMediaView): OnlineSpecRates {
  return {
    cpcMin: view.cpcMin,
    cpcMax: view.cpcMax,
    cpmMin: view.cpmMin,
    cpmMax: view.cpmMax,
    minBudget: view.minBudget ?? 0,
  };
}

function defaultBudget(view: PublicMediaView): number {
  return view.minBudget ?? view.monthlyBudgetMin ?? 1_000_000;
}

type Props = {
  isKo: boolean;
  payload: CampaignBuilderPayload;
  views: PublicMediaView[];
  onChange: (next: CampaignBuilderPayload) => void;
};

export function CampaignBuilderDigitalPanel({
  isKo,
  payload,
  views,
  onChange,
}: Props) {
  const [q, setQ] = useState("");
  const [mediaType, setMediaType] = useState("");

  const viewBySlug = useMemo(
    () => new Map(views.map((v) => [v.slug, v])),
    [views],
  );

  const mediaTypes = useMemo(() => {
    const set = new Set<string>();
    for (const v of views) {
      if (v.mediaType) set.add(v.mediaType);
    }
    return [...set].sort();
  }, [views]);

  const filtered = useMemo(
    () =>
      filterOnlineCatalog(views, {
        q,
        mediaType: mediaType || undefined,
      }),
    [views, q, mediaType],
  );

  const addedSlugs = new Set(payload.digitalLines.map((l) => l.slug));

  const aggregate = useMemo(() => {
    const lines = payload.digitalLines.map((line) => ({
      spec: viewBySlug.get(line.slug)
        ? toOnlineSpecRates(viewBySlug.get(line.slug)!)
        : null,
      budgetWon: line.budgetWon,
    }));
    return aggregatePerformanceEstimates(lines);
  }, [payload.digitalLines, viewBySlug]);

  function addLine(view: PublicMediaView) {
    if (addedSlugs.has(view.slug)) return;
    const nextLine: DigitalCampaignLine = {
      slug: view.slug,
      budgetWon: defaultBudget(view),
    };
    onChange({
      ...payload,
      digitalLines: [...payload.digitalLines, nextLine],
    });
  }

  function updateBudget(slug: string, budgetWon: number) {
    onChange({
      ...payload,
      digitalLines: payload.digitalLines.map((l) =>
        l.slug === slug ? { ...l, budgetWon } : l,
      ),
    });
  }

  function updateNote(slug: string, note: string) {
    onChange({
      ...payload,
      digitalLines: payload.digitalLines.map((l) =>
        l.slug === slug
          ? { ...l, note: note.trim() || undefined }
          : l,
      ),
    });
  }

  function removeLine(slug: string) {
    onChange({
      ...payload,
      digitalLines: payload.digitalLines.filter((l) => l.slug !== slug),
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold">
            {isKo ? "디지털 채널" : "Digital channels"}
          </h2>
          <p className="text-xs text-muted-foreground">{CATALOG_ESTIMATION_NOTICE}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            {isKo ? "총 예산" : "Total budget"}:{" "}
            <PriceDisplay won={totalBudgetWon(payload)} className="font-semibold" />
          </p>
          {aggregate.reachMin != null && aggregate.reachMax != null ? (
            <p className="text-muted-foreground">
              {isKo ? "예상 도달" : "Est. reach"}:{" "}
              {formatKpiRange(aggregate.reachMin, aggregate.reachMax)}
            </p>
          ) : null}
          {aggregate.clicksMin != null && aggregate.clicksMax != null ? (
            <p className="text-muted-foreground">
              {isKo ? "예상 클릭" : "Est. clicks"}:{" "}
              {formatKpiRange(aggregate.clicksMin, aggregate.clicksMax)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isKo ? "매체 검색…" : "Search media…"}
          className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{isKo ? "전체 유형" : "All types"}</option>
          {mediaTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/40 p-2">
        {filtered.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-muted-foreground">
            {isKo ? "검색 결과 없음" : "No results"}
          </li>
        ) : (
          filtered.slice(0, 40).map((view) => (
            <li
              key={view.slug}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{view.nameKo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {view.platform ?? view.mediaType ?? view.slug}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={addedSlugs.has(view.slug) ? "secondary" : "default"}
                disabled={addedSlugs.has(view.slug)}
                onClick={() => addLine(view)}
              >
                {addedSlugs.has(view.slug)
                  ? isKo
                    ? "추가됨"
                    : "Added"
                  : isKo
                    ? "추가"
                    : "Add"}
              </Button>
            </li>
          ))
        )}
      </ul>

      {payload.digitalLines.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {isKo ? "선택한 라인" : "Selected lines"}
          </h3>
          <ul className="space-y-2">
            {payload.digitalLines.map((line) => {
              const view = viewBySlug.get(line.slug);
              const spec = view ? toOnlineSpecRates(view) : null;
              const est = spec ? estimatePerformance(spec, line.budgetWon) : null;
              return (
                <li
                  key={line.slug}
                  className="space-y-2 rounded-lg border border-border/50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[160px] flex-1">
                      <p className="font-medium">{view?.nameKo ?? line.slug}</p>
                      {est ? (
                        <p className="text-xs text-muted-foreground">
                          {isKo ? "도달" : "Reach"}:{" "}
                          {formatKpiRange(est.reachMin, est.reachMax)} ·{" "}
                          {isKo ? "클릭" : "Clicks"}:{" "}
                          {formatKpiRange(est.clicksMin, est.clicksMax)}
                        </p>
                      ) : null}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      {isKo ? "예산" : "Budget"}
                      <input
                        type="number"
                        min={0}
                        step={100_000}
                        value={line.budgetWon}
                        onChange={(e) =>
                          updateBudget(line.slug, Number(e.target.value) || 0)
                        }
                        className="w-32 rounded border border-border bg-background px-2 py-1"
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeLine(line.slug)}
                    >
                      {isKo ? "삭제" : "Remove"}
                    </Button>
                  </div>
                  <label className="block w-full text-sm">
                    {isKo ? "메모" : "Notes"}
                    <input
                      value={line.note ?? ""}
                      onChange={(e) => updateNote(line.slug, e.target.value)}
                      data-testid={`builder-digital-note-${line.slug}`}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
