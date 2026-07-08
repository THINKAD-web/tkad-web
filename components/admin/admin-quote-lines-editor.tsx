"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlannerMediaPackagePicker } from "@/components/planner/media-package-picker";
import { PlannerMediaQuantityControl } from "@/components/planner/planner-media-quantity-control";
import type { AdminMediaDto } from "@/lib/admin-media-dto";
import {
  adminLineMediaItemForControl,
  adminMediaDtoToMediaItem,
  catalogLinePrice,
  computeAdminCatalogLineAmount,
  createCustomQuoteLine,
  type AdminQuoteCatalogLine,
  type AdminQuoteLine,
  type AdminQuotePeriodKey,
} from "@/lib/admin-quote-lines";
import { catalogPriceFieldToWon } from "@/lib/pricing";
import { formatPricePeriodShortLabel } from "@/lib/media-price-format";
import { isPerUnitGradePriceOptions } from "@/lib/media-quantity";
import { Plus, Trash2 } from "lucide-react";
import {
  adminQuoteSelectClass,
  adminQuoteSurfaceMutedClass,
  adminQuoteTableRowClass,
  adminQuoteTableTheadClass,
} from "@/components/admin/admin-quote-page-shell";

function formatWon(n: number) {
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(n))}원`;
}

type Props = {
  lines: AdminQuoteLine[];
  onChange: (next: AdminQuoteLine[]) => void;
  medias: AdminMediaDto[];
  isKo: boolean;
  locale: string;
  days: number;
  factorForPeriod: (p: AdminQuotePeriodKey, d: number) => number;
};

export function AdminQuoteLinesEditor({
  lines,
  onChange,
  medias,
  isKo,
  locale,
  days,
  factorForPeriod,
}: Props) {
  const mediaById = new Map(medias.map((m) => [m.id, m]));

  const updateLine = (lineId: string, patch: Partial<AdminQuoteLine>) => {
    onChange(
      lines.map((line) =>
        line.lineId === lineId ? ({ ...line, ...patch } as AdminQuoteLine) : line,
      ),
    );
  };

  const removeLine = (lineId: string) => {
    onChange(lines.filter((line) => line.lineId !== lineId));
  };

  const catalogLineSubtotal = (line: Extract<AdminQuoteLine, { kind: "catalog" }>) => {
    const m = mediaById.get(line.mediaId);
    if (!m) return 0;
    const { rawPrice, period } = catalogLinePrice(m, line.priceOptionIndex);
    return computeAdminCatalogLineAmount(
      rawPrice,
      period,
      days,
      line.quantity,
      factorForPeriod,
    );
  };

  return (
    <div className="space-y-3">
      {lines.length === 0 ? (
        <p className={`${adminQuoteSurfaceMutedClass} border-dashed px-4 py-8 text-center text-sm text-muted-foreground`}>
          아래 매체 목록에서 「라인 추가」로 견적 항목을 넣거나, 커스텀 비용을 추가하세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className={adminQuoteTableTheadClass}>
              <tr className="border-b">
                <th className="px-3 py-2">항목</th>
                <th className="w-36 px-2 py-2">등급</th>
                <th className="w-40 px-2 py-2">수량</th>
                <th className="w-28 px-2 py-2 text-right">단가</th>
                <th className="w-28 px-2 py-2 text-right">소계</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                if (line.kind === "custom") {
                  const subtotal = Math.round(
                    Math.max(0, line.unitPriceWon) * Math.max(1, line.quantity),
                  );
                  return (
                    <tr key={line.lineId} className={adminQuoteTableRowClass}>
                      <td className="px-3 py-2 align-top">
                        <Input
                          value={line.name}
                          onChange={(e) =>
                            updateLine(line.lineId, { name: e.target.value })
                          }
                          placeholder="예) 제작비, 디자인 시안비"
                          className="h-9 text-sm"
                        />
                        <span className="mt-1 inline-block text-[10px] text-muted-foreground">
                          커스텀 비용
                        </span>
                      </td>
                      <td className="px-2 py-2 align-middle text-xs text-muted-foreground">
                        —
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <Input
                          type="number"
                          min={1}
                          value={String(line.quantity)}
                          onChange={(e) => {
                            const n = Math.max(
                              1,
                              parseInt(e.target.value, 10) || 1,
                            );
                            updateLine(line.lineId, { quantity: n });
                          }}
                          className="h-9 w-24 text-right text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <Input
                          type="number"
                          min={0}
                          value={String(line.unitPriceWon)}
                          onChange={(e) => {
                            const n = Math.max(
                              0,
                              parseInt(e.target.value, 10) || 0,
                            );
                            updateLine(line.lineId, { unitPriceWon: n });
                          }}
                          className="h-9 w-28 text-right text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-2 align-middle text-right font-semibold tabular-nums">
                        {formatWon(subtotal)}
                      </td>
                      <td className="px-2 py-2 align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => removeLine(line.lineId)}
                          aria-label="라인 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                }

                const m = mediaById.get(line.mediaId);
                if (!m) {
                  return (
                    <tr key={line.lineId} className="border-b bg-amber-50/50">
                      <td colSpan={6} className="px-3 py-2 text-xs text-amber-800">
                        삭제된 매체 ({line.mediaId}) — 라인을 제거하세요.
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-7 text-xs"
                          onClick={() => removeLine(line.lineId)}
                        >
                          삭제
                        </Button>
                      </td>
                    </tr>
                  );
                }

                const controlMedia = adminLineMediaItemForControl(m, line.lineId);
                const isGrade = isPerUnitGradePriceOptions(
                  adminMediaDtoToMediaItem(m),
                );
                const { rawPrice, period, label } = catalogLinePrice(
                  m,
                  line.priceOptionIndex,
                );
                const unitWon = catalogPriceFieldToWon(rawPrice);
                const subtotal = catalogLineSubtotal(line);
                const nameBase = isKo ? m.name : (m.nameEn || m.name) || m.name;
                const displayName = label ? `${nameBase} (${label})` : nameBase;

                return (
                  <tr
                    key={line.lineId}
                    className={adminQuoteTableRowClass}
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-foreground dark:text-hero-fg">
                        {displayName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.location} · {m.type}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      {isGrade ? (
                        <PlannerMediaPackagePicker
                          media={controlMedia}
                          isKo={isKo}
                          quantities={{ [line.lineId]: line.quantity }}
                          priceOptionIndex={{
                            [line.lineId]: line.priceOptionIndex,
                          }}
                          onQuantityChange={() => {}}
                          onPriceOptionChange={(idx) => {
                            const opt = m.priceOptions?.[idx];
                            const patch: Partial<AdminQuoteCatalogLine> = {
                              priceOptionIndex: Math.max(0, idx),
                            };
                            if (opt?.units != null && opt.units > 0) {
                              patch.quantity = opt.units;
                            }
                            updateLine(line.lineId, patch);
                          }}
                          compact
                        />
                      ) : (m.priceOptions?.length ?? 0) > 0 ? (
                        <select
                          className={`w-full ${adminQuoteSelectClass} py-1.5 text-xs`}
                          value={line.priceOptionIndex}
                          onChange={(e) => {
                            const n = Math.max(
                              0,
                              parseInt(e.target.value, 10) || 0,
                            );
                            updateLine(line.lineId, { priceOptionIndex: n });
                          }}
                        >
                          {(m.priceOptions ?? []).map((o, i) => (
                            <option key={`${o.label}-${i}`} value={i}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top">
                      {isGrade ? (
                        <div className="space-y-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={String(line.quantity)}
                            onChange={(e) => {
                              const n = Math.max(
                                1,
                                parseInt(e.target.value, 10) || 1,
                              );
                              updateLine(line.lineId, { quantity: n });
                            }}
                            className="h-9 w-24 text-right text-sm tabular-nums"
                            aria-label={isKo ? "대수" : "Fleet count"}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {isKo ? "대" : "units"}
                          </p>
                        </div>
                      ) : (
                        <PlannerMediaQuantityControl
                          media={controlMedia}
                          isKo={isKo}
                          quantities={{ [line.lineId]: line.quantity }}
                          priceOptionIndex={{
                            [line.lineId]: line.priceOptionIndex,
                          }}
                          onQuantityChange={(units) =>
                            updateLine(line.lineId, {
                              quantity: Math.max(1, units),
                            })
                          }
                          onPriceOptionChange={(idx) =>
                            updateLine(line.lineId, {
                              priceOptionIndex: Math.max(0, idx),
                            })
                          }
                          compact
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 align-middle text-right tabular-nums text-xs">
                      {new Intl.NumberFormat("ko-KR").format(unitWon)}
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        {formatPricePeriodShortLabel(period, locale)}
                      </span>
                    </td>
                    <td className="px-2 py-2 align-middle text-right font-semibold tabular-nums">
                      {formatWon(subtotal)}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => removeLine(line.lineId)}
                        aria-label="라인 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed"
          onClick={() => onChange([...lines, createCustomQuoteLine()])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          커스텀 라인 추가
        </Button>
        {[
          { name: "제작비", price: 500000 },
          { name: "디자인 시안비", price: 300000 },
          { name: "운영·관리비", price: 200000 },
          { name: "출력·시공비", price: 800000 },
        ].map((preset) => (
          <Button
            key={preset.name}
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() =>
              onChange([
                ...lines,
                createCustomQuoteLine({
                  name: preset.name,
                  quantity: 1,
                  unitPriceWon: preset.price,
                }),
              ])
            }
          >
            + {preset.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
