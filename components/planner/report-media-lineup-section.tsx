"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlignJustify,
  LayoutGrid,
  List,
  PanelTop,
} from "lucide-react";
import { DiscoveryMediaCard } from "@/components/discovery/media-card";
import { MediaDetailCard } from "@/components/document/media-detail-card";
import { DocumentSectionHeading } from "@/components/document/document-layout";
import type { DocumentMediaDetail } from "@/lib/document-media-detail";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import {
  MEDIA_CHIP_ACTIVE,
  MEDIA_CHIP_INACTIVE,
} from "@/lib/media-discovery-filter-chips";
import type {
  PlannerExportMediaRow,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import {
  readPlannerReportViewMode,
  writePlannerReportViewMode,
  type PlannerReportViewMode,
} from "@/lib/planner-report-view-mode";
import { cn } from "@/lib/utils";

const VIEW_MODES: {
  id: PlannerReportViewMode;
  labelKo: string;
  labelEn: string;
  icon: typeof List;
}[] = [
  { id: "detail", labelKo: "상세", labelEn: "Detail", icon: PanelTop },
  { id: "feed", labelKo: "피드", labelEn: "Feed", icon: List },
  { id: "card", labelKo: "카드", labelEn: "Card", icon: LayoutGrid },
  { id: "compact", labelKo: "컴팩트", labelEn: "Compact", icon: AlignJustify },
];

function exportRowToDetail(
  row: PlannerExportMediaRow,
  index: number,
): DocumentMediaDetail {
  const mediaId = row.id;
  return {
    id: mediaId ?? `row-${index}`,
    name: row.name,
    location: row.location,
    thumbUrl: row.thumbUrl,
    categoryLabel: row.categoryLabel,
    size: row.size,
    operatingHours: row.operatingHours,
    dailyTraffic: row.dailyTraffic,
    broadcastLabel: row.broadcastLabel,
    monthlyPriceLabel: row.monthlyPriceLabel ?? row.priceLabel,
    lineTotalLabel: row.lineTotalLabel,
    recommendReason: row.recommendReason,
    exposureContributionPct: row.exposureContributionPct,
    budgetContributionPct: row.budgetContributionPct,
  };
}

function exportRowToCatalogItem(row: PlannerExportMediaRow, index: number): HomeCatalogMediaItem {
  const id = row.id ?? `row-${index}`;
  return {
    id,
    name: row.name,
    type: row.type ?? row.categoryLabel,
    region: row.region,
    location: row.location,
    size: row.size,
    dailyFootTraffic: row.dailyTraffic,
    thumbnailUrl: row.thumbUrl ?? undefined,
  };
}

function mediaHref(row: PlannerExportMediaRow): string | null {
  const mediaId = row.id;
  if (!mediaId || String(mediaId).startsWith("row-")) return null;
  return `/media/${mediaId}`;
}

function priceLabelForRow(row: PlannerExportMediaRow): string | undefined {
  return row.monthlyPriceLabel ?? row.priceLabel;
}

function DetailLineupCard({
  row,
  index,
  isKo,
  portfolioSize,
}: {
  row: PlannerExportMediaRow;
  index: number;
  isKo: boolean;
  portfolioSize: number;
}) {
  const href = mediaHref(row);
  const detail = exportRowToDetail(row, index);
  return (
    <MediaDetailCard
      detail={detail}
      isKo={isKo}
      showContribution
      largeThumb
      portfolioSize={portfolioSize}
      mediaPageHref={href ?? undefined}
    />
  );
}

function DiscoveryLineupCard({
  row,
  index,
  isKo,
  viewMode,
}: {
  row: PlannerExportMediaRow;
  index: number;
  isKo: boolean;
  viewMode: Exclude<PlannerReportViewMode, "detail">;
}) {
  const href = mediaHref(row) ?? "#";
  const item = exportRowToCatalogItem(row, index);
  const priceLabel = priceLabelForRow(row);
  const highlights = row.recommendReason ? [row.recommendReason] : [];

  if (viewMode === "compact") {
    const metaLine = [row.region, row.type ?? row.categoryLabel, priceLabel]
      .filter(Boolean)
      .join(" · ");
    return (
      <DiscoveryMediaCard
        variant="compact"
        compactLayout="row"
        item={item}
        href={href}
        metaLine={metaLine}
        isKo={isKo}
        showPlanButton={false}
      />
    );
  }

  if (viewMode === "card") {
    return (
      <DiscoveryMediaCard
        variant="compact"
        compactLayout="grid"
        item={item}
        href={href}
        priceLabel={priceLabel}
        isKo={isKo}
        className="h-full"
        showPlanButton={false}
      />
    );
  }

  return (
    <DiscoveryMediaCard
      variant="feed"
      item={item}
      href={href}
      highlights={highlights}
      locationLine={row.location ?? null}
      isKo={isKo}
      showPlanButton={false}
    />
  );
}

function ReportMediaRow({
  row,
  index,
  isKo,
  portfolioSize,
  viewMode,
}: {
  row: PlannerExportMediaRow;
  index: number;
  isKo: boolean;
  portfolioSize: number;
  viewMode: PlannerReportViewMode;
}) {
  if (viewMode === "detail") {
    return (
      <DetailLineupCard
        row={row}
        index={index}
        isKo={isKo}
        portfolioSize={portfolioSize}
      />
    );
  }
  return (
    <DiscoveryLineupCard row={row} index={index} isKo={isKo} viewMode={viewMode} />
  );
}

function lineupListClass(viewMode: PlannerReportViewMode): string {
  if (viewMode === "card") {
    return "grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 [&>*]:min-w-0";
  }
  if (viewMode === "compact") {
    return "grid grid-cols-1 gap-0.5 sm:grid-cols-2 sm:gap-x-3 lg:grid-cols-3 [&>*]:min-w-0";
  }
  return "space-y-3 sm:space-y-4";
}

type Props = {
  payload: Pick<
    PlannerReportExportPayload,
    "portfolio" | "portfolioGroups" | "isKo"
  >;
};

export function ReportMediaLineupSection({ payload: p }: Props) {
  const isKo = p.isKo;
  const [viewMode, setViewMode] = useState<PlannerReportViewMode>("detail");

  useEffect(() => {
    setViewMode(readPlannerReportViewMode());
  }, []);

  const onViewModeChange = useCallback((mode: PlannerReportViewMode) => {
    setViewMode(mode);
    writePlannerReportViewMode(mode);
  }, []);

  const listClass = lineupListClass(viewMode);

  return (
    <section className="space-y-4 py-2" data-screenshot="planner-report-media-lineup">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DocumentSectionHeading className="mb-0">
          {isKo ? "매체 구성" : "Media lineup"}
        </DocumentSectionHeading>
        {p.portfolio.length > 0 ? (
          <div
            className="scrollbar-hide flex shrink-0 overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10"
            data-screenshot="planner-report-view-mode"
            role="group"
            aria-label={isKo ? "매체 보기 방식" : "Media view mode"}
          >
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              const active = viewMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onViewModeChange(mode.id)}
                  title={isKo ? mode.labelKo : mode.labelEn}
                  aria-label={isKo ? mode.labelKo : mode.labelEn}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all",
                    active ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="hidden sm:inline">
                    {isKo ? mode.labelKo : mode.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {p.portfolio.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-[#F8F9FC] px-4 py-8 text-center text-sm text-gray-500">
          {isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected."}
        </p>
      ) : p.portfolioGroups?.length ? (
        <div className="space-y-8">
          {p.portfolioGroups.map((group) => (
            <div key={group.regionLabel} className="space-y-4">
              <h4 className="border-b border-violet-100 pb-2 text-base font-bold text-gray-900">
                {group.regionLabel}
              </h4>
              {group.categories.map((cat) => (
                <div key={`${group.regionLabel}-${cat.categoryLabel}`} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">
                    {cat.categoryLabel}
                  </p>
                  <ul className={listClass}>
                    {cat.items.map((row, i) => (
                      <li
                        key={row.id ?? `${group.regionLabel}-${cat.categoryLabel}-${i}`}
                        className={viewMode === "card" ? "h-full min-h-0" : undefined}
                      >
                        <ReportMediaRow
                          row={row}
                          index={i}
                          isKo={isKo}
                          portfolioSize={p.portfolio.length}
                          viewMode={viewMode}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <ul className={listClass}>
          {p.portfolio.map((row, i) => (
            <li
              key={row.id ?? `row-${i}`}
              className={viewMode === "card" ? "h-full min-h-0" : undefined}
            >
              <ReportMediaRow
                row={row}
                index={i}
                isKo={isKo}
                portfolioSize={p.portfolio.length}
                viewMode={viewMode}
              />
            </li>
          ))}
        </ul>
      )}

      {p.portfolio.length > 0 ? (
        <p className="text-[11px] leading-snug text-gray-400">
          {viewMode === "feed"
            ? isKo
              ? "피드 보기는 화면 전용입니다. PDF·PPT는 상세 카드 형식으로 내려받습니다."
              : "Feed view is on-screen only. PDF and PPT exports use the detail card layout."
            : isKo
              ? `PDF·PPT 다운로드는 위에서 선택한 보기(${viewMode === "card" ? "카드" : viewMode === "compact" ? "컴팩트" : "상세"})와 동일한 레이아웃으로 내려받습니다.`
              : `PDF and PPT exports match the selected view (${viewMode === "card" ? "card" : viewMode === "compact" ? "compact" : "detail"}) above.`}
          {p.portfolio.length >= 8 && viewMode === "detail"
            ? isKo
              ? " 매체가 많을 때는 카드형 보기로 페이지 수를 줄일 수 있습니다."
              : " For many media, card view reduces export page count."
            : null}
        </p>
      ) : null}
    </section>
  );
}
