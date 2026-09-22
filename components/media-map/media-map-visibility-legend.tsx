"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import {
  visibilityPinTierRingStroke,
  visibilityPinTierForScore,
} from "@/lib/map-pin-visibility-colors";
import { VISIBILITY_LEGEND_GROUPS } from "@/lib/media-map/map-visibility-legend-groups";
import {
  MEDIA_TYPE_PIN_LEGEND_ENTRIES,
  pinLegendMiniDataUrl,
} from "@/lib/map-pin-styles";
import { mapFloatingPanelClass } from "@/components/media-map/map-floating-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  className?: string;
  subwayEnabled?: boolean;
  onSubwayEnabledChange?: (enabled: boolean) => void;
  showSubwayToggle?: boolean;
  showServiceRegionCoverageNote?: boolean;
  serviceRegionDistrictCount?: number;
};

export function MediaMapVisibilityLegend({
  isKo = true,
  className,
  subwayEnabled = true,
  onSubwayEnabledChange,
  showSubwayToggle = false,
  showServiceRegionCoverageNote = false,
  serviceRegionDistrictCount,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const forLightMapTiles = resolvedTheme !== "dark";

  return (
    <div
      className={cn(
        mapFloatingPanelClass("pointer-events-auto overflow-hidden"),
        className,
      )}
      aria-label={isKo ? "지도 범례" : "Map legend"}
    >
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="tkad-type-meta flex w-full items-center justify-between gap-2 px-3 py-2 font-semibold text-foreground transition-colors hover:bg-muted/40"
        aria-expanded={expanded}
      >
        <span className="inline-flex items-center gap-2">
          <img
            src={pinLegendMiniDataUrl("digital", forLightMapTiles, 92)}
            alt=""
            className="h-4 w-4 shrink-0"
            aria-hidden
          />
          {isKo ? "범례" : "Legend"}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-tkad-muted transition-transform",
            expanded ? "rotate-180" : "",
          )}
          aria-hidden
        />
      </button>

      {showServiceRegionCoverageNote ? (
        <div
          className="border-t border-border/70 px-3 py-2 dark:border-white/10"
          data-screenshot="media-map-legend-coverage-note"
        >
          <p className="tkad-type-note leading-snug text-tkad-secondary">
            <span
              className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-sm border border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)]/20 align-middle"
              aria-hidden
            />
            {isKo ? (
              <>
                <span className="font-semibold text-foreground">권역 면</span>
                {typeof serviceRegionDistrictCount === "number"
                  ? ` · ${serviceRegionDistrictCount}구역`
                  : null}
                <span className="text-tkad-muted">
                  {" "}
                  — 중심점 원형 근사(실경계 아님)
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">Area fill</span>
                {typeof serviceRegionDistrictCount === "number"
                  ? ` · ${serviceRegionDistrictCount} districts`
                  : null}
                <span className="text-tkad-muted"> — approx. circles</span>
              </>
            )}
          </p>
        </div>
      ) : null}

      {showSubwayToggle && onSubwayEnabledChange ? (
        <div className="border-t border-border/70 px-3 py-2 dark:border-white/10">
          <label className="tkad-type-meta flex cursor-pointer items-center justify-between gap-2 font-medium text-foreground">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-0.5 w-4 shrink-0 rounded-full bg-[#00A84D]"
                aria-hidden
              />
              {isKo ? "지하철" : "Subway"}
            </span>
            <input
              type="checkbox"
              checked={subwayEnabled}
              onChange={(e) => onSubwayEnabledChange(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[color:var(--qp-accent)]"
            />
          </label>
        </div>
      ) : null}

      {expanded ? (
        <div className="border-t border-border/70 px-3 pb-2.5 pt-2 dark:border-white/10">
          <p className="tkad-type-note mb-1.5 font-semibold text-foreground">
            {isKo ? "매체 유형" : "Media type"}
          </p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
            {MEDIA_TYPE_PIN_LEGEND_ENTRIES.map((entry) => (
              <li
                key={entry.sampleType}
                className="tkad-type-note inline-flex items-center gap-1.5 text-tkad-secondary"
              >
                <img
                  src={pinLegendMiniDataUrl(
                    entry.sampleType,
                    forLightMapTiles,
                    92,
                  )}
                  alt=""
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                />
                <span className="font-medium text-foreground">
                  {isKo ? entry.labelKo : entry.labelEn}
                </span>
              </li>
            ))}
          </ul>

          <p className="tkad-type-note mb-1.5 mt-3 font-semibold text-foreground">
            {isKo ? "가시성 (숫자·ring)" : "Visibility (# & ring)"}
          </p>
          <ul className="space-y-1">
            {VISIBILITY_LEGEND_GROUPS.map((group) => {
              const tier = group.tierSample;
              const ring = visibilityPinTierRingStroke(
                visibilityPinTierForScore(
                  tier === 5 ? 95 : tier === 3 ? 90 : 50,
                ),
                forLightMapTiles,
              );
              return (
                <li
                  key={group.id}
                  className="tkad-type-note flex items-center gap-2 leading-tight text-tkad-secondary"
                >
                  <span
                    className="relative h-3 w-3 shrink-0 rounded-full border-2 bg-transparent"
                    style={{ borderColor: ring }}
                    aria-hidden
                  >
                    <span className="absolute -right-0.5 -top-1 text-[7px] font-extrabold leading-none text-slate-600 dark:text-slate-300">
                      {tier}
                    </span>
                  </span>
                  <span>
                    <span className="font-medium text-foreground">
                      {isKo ? group.labelKo : group.labelEn}
                    </span>
                    <span className="text-tkad-muted">
                      {" "}
                      ({isKo ? group.rangeLabelKo : group.rangeLabelEn})
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="tkad-type-note mt-1.5 text-tkad-muted">
            {isKo
              ? "핀 숫자·ring=가시성 · 틸 원=밀집 · 안쪽=매체 유형"
              : "Pin #/ring = visibility · teal disk = cluster · inner = type"}
          </p>
          {showSubwayToggle ? (
            <p className="tkad-type-note mt-2 text-tkad-muted">
              {isKo ? (
                <>
                  지하철 ©{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    OpenStreetMap
                  </a>
                </>
              ) : (
                <>
                  Subway ©{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    OpenStreetMap
                  </a>
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
