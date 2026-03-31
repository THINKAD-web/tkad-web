"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { MediaItem } from "@/lib/media-data";
import type {
  CatalogBounds,
  MediaAdvancedFilterState,
  MediaSizeTier,
  OperatingHoursBucket,
  ResolutionBucket,
  TargetAgeBucket,
} from "@/lib/media-filter-advanced";
import { ADVANCED_RANGE } from "@/lib/media-filter-advanced";

type Props = {
  catalog: MediaItem[];
  bounds: CatalogBounds;
  value: MediaAdvancedFilterState;
  onChange: (next: MediaAdvancedFilterState) => void;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

const AGE_KEYS: TargetAgeBucket[] = [
  "teen",
  "twenties",
  "thirties",
  "forties",
  "fiftyPlus",
];

const RESOLUTION_SELECT: { v: ResolutionBucket; labelKey: "resHd" | "resFhd" | "res4k" }[] =
  [
    { v: "hd", labelKey: "resHd" },
    { v: "fhd", labelKey: "resFhd" },
    { v: "fourk", labelKey: "res4k" },
  ];

/**
 * 고급 필터 UI 순서: `lib/media-advanced-filters-schema.ts` 의
 * high_priority_filters → secondary_filters → (앱 확장) 추가 옵션.
 */
const rangeMinClass =
  "min-h-11 w-full cursor-pointer touch-manipulation py-2 [-webkit-appearance:none] appearance-none accent-gold";
const rangeMaxClass =
  "min-h-11 w-full cursor-pointer touch-manipulation py-2 [-webkit-appearance:none] appearance-none accent-navy";

export default function MediaAdvancedFiltersPanel({
  catalog,
  bounds,
  value,
  onChange,
}: Props) {
  const t = useTranslations("media.advanced");
  const R = ADVANCED_RANGE;

  const patch = (partial: Partial<MediaAdvancedFilterState>) => {
    onChange({ ...value, ...partial });
  };

  const toggleTag = (tag: string) => {
    const lower = tag.toLowerCase();
    const has = value.selectedTags.some((x) => x.toLowerCase() === lower);
    patch({
      selectedTags: has
        ? value.selectedTags.filter((x) => x.toLowerCase() !== lower)
        : [...value.selectedTags, tag],
    });
  };

  const toggleAge = (k: TargetAgeBucket) => {
    const next = { ...value.targetAgePick, [k]: !value.targetAgePick[k] };
    if (!next[k]) delete next[k];
    patch({ targetAgePick: next });
  };

  const tagOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of catalog) {
      for (const x of m.tags ?? []) {
        const u = x.trim();
        if (u) s.add(u);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [catalog]);

  const subCategoryOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of catalog) {
      const u = m.subCategory?.trim();
      if (u) s.add(u);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [catalog]);

  const sizeOptions: { v: "all" | MediaSizeTier; label: string }[] = [
    { v: "all", label: t("sizeAll") },
    { v: "small", label: t("sizeSmall") },
    { v: "medium", label: t("sizeMedium") },
    { v: "large", label: t("sizeLarge") },
  ];

  const hourOptions: { v: "all" | OperatingHoursBucket; label: string }[] = [
    { v: "all", label: t("hoursAll") },
    { v: "24h", label: t("hours24") },
    { v: "day", label: t("hoursDay") },
    { v: "night", label: t("hoursNight") },
  ];

  const priceStep =
    bounds.maxPrice - bounds.minPrice <= 500 ? 50 : 100;

  return (
    <div className="space-y-6">
      {/* high_priority_filters */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-navy/70">
          {t("sectionHighPriority")}
        </p>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("visibilityRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.visibilityMin} – {value.visibilityMax}
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("sliderMin")}
                </span>
                <input
                  type="range"
                  min={R.visibility.min}
                  max={R.visibility.max}
                  step={1}
                  value={clamp(
                    value.visibilityMin,
                    R.visibility.min,
                    value.visibilityMax,
                  )}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    patch({
                      visibilityMin: clamp(
                        v,
                        R.visibility.min,
                        value.visibilityMax,
                      ),
                    });
                  }}
                  className={rangeMinClass}
                />
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("sliderMax")}
                </span>
                <input
                  type="range"
                  min={R.visibility.min}
                  max={R.visibility.max}
                  step={1}
                  value={clamp(
                    value.visibilityMax,
                    value.visibilityMin,
                    R.visibility.max,
                  )}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    patch({
                      visibilityMax: clamp(
                        v,
                        value.visibilityMin,
                        R.visibility.max,
                      ),
                    });
                  }}
                  className={rangeMaxClass}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("impressionsRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.impressionsMin.toLocaleString()} –{" "}
              {value.impressionsMax.toLocaleString()} {t("impressionsUnit")}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.impressions.min}
                max={R.impressions.max}
                step={50_000}
                value={clamp(
                  value.impressionsMin,
                  R.impressions.min,
                  value.impressionsMax,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    impressionsMin: clamp(
                      v,
                      R.impressions.min,
                      value.impressionsMax,
                    ),
                  });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.impressions.min}
                max={R.impressions.max}
                step={50_000}
                value={clamp(
                  value.impressionsMax,
                  value.impressionsMin,
                  R.impressions.max,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    impressionsMax: clamp(
                      v,
                      value.impressionsMin,
                      R.impressions.max,
                    ),
                  });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("cpmRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.cpmMin.toLocaleString()} – {value.cpmMax.toLocaleString()}{" "}
              {t("cpmUnit")}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.cpm.min}
                max={R.cpm.max}
                step={100}
                value={clamp(value.cpmMin, R.cpm.min, value.cpmMax)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({ cpmMin: clamp(v, R.cpm.min, value.cpmMax) });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.cpm.min}
                max={R.cpm.max}
                step={100}
                value={clamp(value.cpmMax, value.cpmMin, R.cpm.max)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({ cpmMax: clamp(v, value.cpmMin, R.cpm.max) });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("reachRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.reachMin.toLocaleString()} –{" "}
              {value.reachMax.toLocaleString()} {t("reachUnit")}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.reach.min}
                max={R.reach.max}
                step={10_000}
                value={clamp(value.reachMin, R.reach.min, value.reachMax)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({ reachMin: clamp(v, R.reach.min, value.reachMax) });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.reach.min}
                max={R.reach.max}
                step={10_000}
                value={clamp(value.reachMax, value.reachMin, R.reach.max)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({ reachMax: clamp(v, value.reachMin, R.reach.max) });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("frequencyRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.frequencyMin.toFixed(1)} – {value.frequencyMax.toFixed(1)}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.frequency.min}
                max={R.frequency.max}
                step={0.1}
                value={clamp(
                  value.frequencyMin,
                  R.frequency.min,
                  value.frequencyMax,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    frequencyMin: clamp(v, R.frequency.min, value.frequencyMax),
                  });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.frequency.min}
                max={R.frequency.max}
                step={0.1}
                value={clamp(
                  value.frequencyMax,
                  value.frequencyMin,
                  R.frequency.max,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    frequencyMax: clamp(v, value.frequencyMin, R.frequency.max),
                  });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("dailyFootRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.footMin.toLocaleString()} – {value.footMax.toLocaleString()}{" "}
              {t("dailyFootUnit")}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.dailyFoot.min}
                max={R.dailyFoot.max}
                step={5000}
                value={clamp(value.footMin, R.dailyFoot.min, value.footMax)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({ footMin: clamp(v, R.dailyFoot.min, value.footMax) });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.dailyFoot.min}
                max={R.dailyFoot.max}
                step={5000}
                value={clamp(value.footMax, value.footMin, R.dailyFoot.max)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({ footMax: clamp(v, value.footMin, R.dailyFoot.max) });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-navy">
              {t("targetAgeBands")}
            </p>
            <div className="flex flex-wrap gap-2">
              {AGE_KEYS.map((k) => (
                <label
                  key={k}
                  className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 rounded-lg border border-navy/15 bg-white px-3 py-2 text-xs font-medium text-navy has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/40"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(value.targetAgePick[k])}
                    onChange={() => toggleAge(k)}
                    className="size-4 shrink-0 rounded border-navy/30 text-gold accent-gold"
                  />
                  {t(`age.${k}`)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-navy">{t("tags")}</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {t("tagsHint")}
            </p>
            {tagOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("tagsEmpty")}</p>
            ) : (
              <div className="max-h-32 overflow-y-auto overscroll-contain rounded-md border border-navy/10 p-2 touch-pan-y">
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <label
                      key={tag}
                      className="flex min-h-10 cursor-pointer touch-manipulation items-center gap-2 rounded-lg border border-navy/15 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-navy has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/40"
                    >
                      <input
                        type="checkbox"
                        checked={value.selectedTags.some(
                          (x) => x.toLowerCase() === tag.toLowerCase(),
                        )}
                        onChange={() => toggleTag(tag)}
                        className="size-4 shrink-0 rounded border-navy/30 text-gold accent-gold"
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("engagementRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {(value.engagementMin * 100).toFixed(1)}% –{" "}
              {(value.engagementMax * 100).toFixed(1)}%
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.engagement.min}
                max={R.engagement.max}
                step={0.005}
                value={clamp(
                  value.engagementMin,
                  R.engagement.min,
                  value.engagementMax,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    engagementMin: clamp(
                      v,
                      R.engagement.min,
                      value.engagementMax,
                    ),
                  });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.engagement.min}
                max={R.engagement.max}
                step={0.005}
                value={clamp(
                  value.engagementMax,
                  value.engagementMin,
                  R.engagement.max,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    engagementMax: clamp(
                      v,
                      value.engagementMin,
                      R.engagement.max,
                    ),
                  });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* secondary_filters */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-navy/70">
          {t("sectionSecondary")}
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("subCategory")}
            </label>
            {subCategoryOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("subCatEmpty")}</p>
            ) : (
              <select
                value={value.subCategoryFilter}
                onChange={(e) => patch({ subCategoryFilter: e.target.value })}
                className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              >
                <option value="all">{t("subCategoryAll")}</option>
                {subCategoryOptions.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("landmarkSearch")}
            </label>
            <input
              type="search"
              value={value.landmarkQuery}
              onChange={(e) => patch({ landmarkQuery: e.target.value })}
              placeholder={t("landmarkPlaceholder")}
              className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("stationSearch")}
            </label>
            <input
              type="search"
              value={value.stationQuery}
              onChange={(e) => patch({ stationQuery: e.target.value })}
              placeholder={t("stationPlaceholder")}
              className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("widthMRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.widthMinM.toFixed(1)} – {value.widthMaxM.toFixed(1)} m
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.widthM.min}
                max={R.widthM.max}
                step={0.5}
                value={clamp(value.widthMinM, R.widthM.min, value.widthMaxM)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    widthMinM: clamp(v, R.widthM.min, value.widthMaxM),
                  });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.widthM.min}
                max={R.widthM.max}
                step={0.5}
                value={clamp(value.widthMaxM, value.widthMinM, R.widthM.max)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    widthMaxM: clamp(v, value.widthMinM, R.widthM.max),
                  });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("heightMRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.heightMinM.toFixed(1)} – {value.heightMaxM.toFixed(1)} m
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={R.heightM.min}
                max={R.heightM.max}
                step={0.5}
                value={clamp(value.heightMinM, R.heightM.min, value.heightMaxM)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    heightMinM: clamp(v, R.heightM.min, value.heightMaxM),
                  });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={R.heightM.min}
                max={R.heightM.max}
                step={0.5}
                value={clamp(
                  value.heightMaxM,
                  value.heightMinM,
                  R.heightM.max,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    heightMaxM: clamp(v, value.heightMinM, R.heightM.max),
                  });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("resolution")}
            </label>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {t("resolutionSelectHint")}
            </p>
            <select
              value={value.resolutionFilter}
              onChange={(e) =>
                patch({
                  resolutionFilter: e.target
                    .value as MediaAdvancedFilterState["resolutionFilter"],
                })
              }
              className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              <option value="all">{t("resolutionAll")}</option>
              {RESOLUTION_SELECT.map(({ v, labelKey }) => (
                <option key={v} value={v}>
                  {t(labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("operatingHours")}
            </label>
            <select
              value={value.hoursBucket}
              onChange={(e) =>
                patch({
                  hoursBucket: e.target
                    .value as MediaAdvancedFilterState["hoursBucket"],
                })
              }
              className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              {hourOptions.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 앱 확장: 가격·구성·크기 등 */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-navy/70">
          {t("sectionExtra")}
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("catalogKind")}
            </label>
            <select
              value={value.catalogKind}
              onChange={(e) =>
                patch({
                  catalogKind: e.target
                    .value as MediaAdvancedFilterState["catalogKind"],
                })
              }
              className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              <option value="all">{t("catalogKindAll")}</option>
              <option value="single">{t("catalogKindSingle")}</option>
              <option value="network">{t("catalogKindNetwork")}</option>
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-navy">
              {t("priceRange")}
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.priceMin.toLocaleString()} – {value.priceMax.toLocaleString()}{" "}
              {t("tenThousandWonPerMo")}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={bounds.minPrice}
                max={bounds.maxPrice}
                step={priceStep}
                value={clamp(value.priceMin, bounds.minPrice, value.priceMax)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    priceMin: clamp(v, bounds.minPrice, value.priceMax),
                  });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={bounds.minPrice}
                max={bounds.maxPrice}
                step={priceStep}
                value={clamp(value.priceMax, value.priceMin, bounds.maxPrice)}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    priceMax: clamp(v, value.priceMin, bounds.maxPrice),
                  });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("sizeTier")}
            </label>
            <select
              value={value.sizeTier}
              onChange={(e) =>
                patch({
                  sizeTier: e.target.value as MediaAdvancedFilterState["sizeTier"],
                })
              }
              className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              {sizeOptions.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-navy">{t("installYear")}</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {value.installYearMin} – {value.installYearMax}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min={bounds.minYear}
                max={bounds.maxYear}
                step={1}
                value={clamp(
                  value.installYearMin,
                  bounds.minYear,
                  value.installYearMax,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    installYearMin: clamp(v, bounds.minYear, value.installYearMax),
                  });
                }}
                className={rangeMinClass}
              />
              <input
                type="range"
                min={bounds.minYear}
                max={bounds.maxYear}
                step={1}
                value={clamp(
                  value.installYearMax,
                  value.installYearMin,
                  bounds.maxYear,
                )}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  patch({
                    installYearMax: clamp(v, value.installYearMin, bounds.maxYear),
                  });
                }}
                className={rangeMaxClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-navy">
              {t("advertiserIndustry")}
            </label>
            <input
              type="search"
              value={value.advertiserQuery}
              onChange={(e) => patch({ advertiserQuery: e.target.value })}
              placeholder={t("advertiserPlaceholder")}
              className="min-h-11 w-full rounded-lg border border-navy/15 bg-white px-3 py-2.5 text-sm text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
