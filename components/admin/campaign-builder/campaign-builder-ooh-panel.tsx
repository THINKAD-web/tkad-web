"use client";

import { useMemo, useState } from "react";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import {
  filterOohCatalog,
  uniqueOohRegions,
} from "@/lib/admin-campaign-builder/filter-ooh-catalog";
import { oohLineFromCatalogItem } from "@/lib/admin-campaign-builder/ooh-types";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";
import { PriceDisplay } from "@/components/admin/campaign-builder/price-display";
import { Button } from "@/components/ui/button";

type Props = {
  isKo: boolean;
  payload: CampaignBuilderPayload;
  items: MediaCatalogListItem[];
  onChange: (next: CampaignBuilderPayload) => void;
};

export function CampaignBuilderOohPanel({
  isKo,
  payload,
  items,
  onChange,
}: Props) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [type, setType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const regions = useMemo(() => uniqueOohRegions(items), [items]);
  const types = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.type) set.add(item.type);
    }
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(
    () =>
      filterOohCatalog(items, {
        q,
        region: region || undefined,
        type: type || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      }),
    [items, q, region, type, minPrice, maxPrice],
  );

  const addedIds = new Set(payload.oohLines.map((l) => l.mediaId));

  function addLine(item: MediaCatalogListItem) {
    if (addedIds.has(item.id)) return;
    onChange({
      ...payload,
      oohLines: [...payload.oohLines, oohLineFromCatalogItem(item)],
    });
  }

  function updatePrice(mediaId: string, priceWon: number) {
    onChange({
      ...payload,
      oohLines: payload.oohLines.map((l) =>
        l.mediaId === mediaId ? { ...l, priceWon } : l,
      ),
    });
  }

  function removeLine(mediaId: string) {
    onChange({
      ...payload,
      oohLines: payload.oohLines.filter((l) => l.mediaId !== mediaId),
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4">
      <h2 className="font-bold">{isKo ? "OOH 매체" : "OOH media"}</h2>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isKo ? "매체 검색…" : "Search…"}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{isKo ? "전체 지역" : "All regions"}</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">{isKo ? "전체 유형" : "All types"}</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder={isKo ? "최소 가격" : "Min price"}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder={isKo ? "최대 가격" : "Max price"}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/40 p-2">
        {filtered.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-muted-foreground">
            {isKo ? "검색 결과 없음" : "No results"}
          </li>
        ) : (
          filtered.slice(0, 40).map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[item.region, item.type, item.location].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PriceDisplay won={item.price} className="text-xs" />
                <Button
                  type="button"
                  size="sm"
                  disabled={addedIds.has(item.id)}
                  onClick={() => addLine(item)}
                >
                  {addedIds.has(item.id)
                    ? isKo
                      ? "추가됨"
                      : "Added"
                    : isKo
                      ? "추가"
                      : "Add"}
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      {payload.oohLines.length > 0 ? (
        <ul className="space-y-2">
          {payload.oohLines.map((line) => (
            <li
              key={line.mediaId}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-3"
            >
              <div className="min-w-[160px] flex-1">
                <p className="font-medium">{line.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[line.region, line.type, line.location].filter(Boolean).join(" · ")}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                {isKo ? "가격" : "Price"}
                <input
                  type="number"
                  min={0}
                  step={100_000}
                  value={line.priceWon ?? 0}
                  onChange={(e) =>
                    updatePrice(line.mediaId, Number(e.target.value) || 0)
                  }
                  className="w-32 rounded border border-border bg-background px-2 py-1"
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeLine(line.mediaId)}
              >
                {isKo ? "삭제" : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
