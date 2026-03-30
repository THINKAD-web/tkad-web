"use client";

import { useTranslations } from "next-intl";
import type {
  CatalogBounds,
  MediaAdvancedFilterState,
  MediaSizeTier,
  OperatingHoursBucket,
  ResolutionBucket,
} from "@/lib/media-filter-advanced";

type Props = {
  bounds: CatalogBounds;
  value: MediaAdvancedFilterState;
  onChange: (next: MediaAdvancedFilterState) => void;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export default function MediaAdvancedFiltersPanel({
  bounds,
  value,
  onChange,
}: Props) {
  const t = useTranslations("media.advanced");

  const patch = (partial: Partial<MediaAdvancedFilterState>) => {
    onChange({ ...value, ...partial });
  };

  const toggleRes = (k: ResolutionBucket) => {
    const next = { ...value.resolutionPick, [k]: !value.resolutionPick[k] };
    patch({ resolutionPick: next });
  };

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

  return (
    <details className="rounded-lg border border-navy/10 bg-slate-50/50 open:bg-white">
      <summary className="cursor-pointer select-none list-none px-1 py-2 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          {t("title")}
          <span className="text-xs font-normal text-muted-foreground">
            {t("toggleHint")}
          </span>
        </span>
      </summary>
      <div className="space-y-5 border-t border-navy/8 pt-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-navy">
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
              step={bounds.maxPrice - bounds.minPrice <= 500 ? 50 : 100}
              value={clamp(value.priceMin, bounds.minPrice, value.priceMax)}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({
                  priceMin: clamp(v, bounds.minPrice, value.priceMax),
                });
              }}
              className="w-full accent-gold"
            />
            <input
              type="range"
              min={bounds.minPrice}
              max={bounds.maxPrice}
              step={bounds.maxPrice - bounds.minPrice <= 500 ? 50 : 100}
              value={clamp(value.priceMax, value.priceMin, bounds.maxPrice)}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({
                  priceMax: clamp(v, value.priceMin, bounds.maxPrice),
                });
              }}
              className="w-full accent-navy"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-navy">
            {t("footTrafficRange")}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {value.footMin.toLocaleString()} – {value.footMax.toLocaleString()}
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={bounds.minFoot}
              max={bounds.maxFoot}
              step={Math.max(5000, Math.round((bounds.maxFoot - bounds.minFoot) / 100))}
              value={clamp(value.footMin, bounds.minFoot, value.footMax)}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({
                  footMin: clamp(v, bounds.minFoot, value.footMax),
                });
              }}
              className="w-full accent-gold"
            />
            <input
              type="range"
              min={bounds.minFoot}
              max={bounds.maxFoot}
              step={Math.max(5000, Math.round((bounds.maxFoot - bounds.minFoot) / 100))}
              value={clamp(value.footMax, value.footMin, bounds.maxFoot)}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({
                  footMax: clamp(v, value.footMin, bounds.maxFoot),
                });
              }}
              className="w-full accent-navy"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-navy">
            {t("visibilityRange")}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {value.visibilityMin} – {value.visibilityMax}
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={clamp(value.visibilityMin, 0, value.visibilityMax)}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ visibilityMin: clamp(v, 0, value.visibilityMax) });
              }}
              className="w-full accent-gold"
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={clamp(value.visibilityMax, value.visibilityMin, 100)}
              onChange={(e) => {
                const v = Number(e.target.value);
                patch({ visibilityMax: clamp(v, value.visibilityMin, 100) });
              }}
              className="w-full accent-navy"
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
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {sizeOptions.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-navy">{t("resolution")}</p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            {t("resolutionHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["hd", t("resHd")],
                ["fhd", t("resFhd")],
                ["fourk", t("res4k")],
              ] as const
            ).map(([k, label]) => (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-navy/15 bg-white px-2.5 py-1.5 text-xs font-medium text-navy"
              >
                <input
                  type="checkbox"
                  checked={Boolean(value.resolutionPick[k])}
                  onChange={() => toggleRes(k)}
                  className="rounded border-navy/30 text-gold accent-gold"
                />
                {label}
              </label>
            ))}
          </div>
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
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {hourOptions.map((o) => (
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
              className="w-full accent-gold"
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
              className="w-full accent-navy"
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
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
    </details>
  );
}
