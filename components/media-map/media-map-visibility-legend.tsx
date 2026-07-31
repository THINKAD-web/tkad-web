"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { visibilityPinLegendEntries } from "@/lib/map-pin-visibility-colors";
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
};

export function MediaMapVisibilityLegend({
  isKo = true,
  className,
  subwayEnabled = true,
  onSubwayEnabledChange,
  showSubwayToggle = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  /* 지도 타일과 동일: dark → muted orange 팔레트 */
  const forLightMapTiles = resolvedTheme !== "dark";
  const visibilityEntries = visibilityPinLegendEntries(forLightMapTiles);

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
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-tkad-muted" aria-hidden />
        ) : (
          <ChevronDown
            className="h-3.5 w-3.5 rotate-180 text-tkad-muted"
            aria-hidden
          />
        )}
      </button>

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
          <ul className="space-y-1.5">
            {MEDIA_TYPE_PIN_LEGEND_ENTRIES.map((entry) => (
              <li
                key={entry.letter}
                className="tkad-type-note leading-tight text-tkad-secondary"
              >
                <span className="flex items-start gap-2">
                  <img
                    src={pinLegendMiniDataUrl(
                      entry.sampleType,
                      forLightMapTiles,
                      92,
                    )}
                    alt=""
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">
                      {entry.letter} · {isKo ? entry.labelKo : entry.labelEn}
                    </span>
                    {entry.noteKo ? (
                      <span className="mt-0.5 block text-tkad-muted">
                        {isKo ? entry.noteKo : entry.noteEn}
                      </span>
                    ) : null}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="tkad-type-note mb-1.5 mt-3 font-semibold text-foreground">
            {isKo ? "가시성 (외곽 ring)" : "Visibility (outer ring)"}
          </p>
          <ul className="space-y-1">
            {visibilityEntries.map((tier) => (
              <li
                key={tier.tier}
                className="tkad-type-note flex items-center gap-2 leading-tight text-tkad-secondary"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border-2 bg-transparent"
                  style={{ borderColor: tier.stroke }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="font-medium text-foreground">
                    {isKo ? tier.labelKo : tier.labelEn}
                  </span>
                  {tier.tier > 0 ? (
                    <span className="text-tkad-muted">
                      {" "}
                      ({isKo ? tier.rangeLabelKo : tier.rangeLabelEn})
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p className="tkad-type-note mt-1.5 text-tkad-muted">
            {isKo
              ? "외곽 ring 진할수록 높은 가시성 · 모양·문자로 매체 유형 구분"
              : "Darker outer ring = higher visibility · shape and letter = media type"}
          </p>
          {showSubwayToggle ? (
            <p className="tkad-type-note mt-2 text-tkad-muted">
              {isKo ? (
                <>
                  지하철 노선·역 ©{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    OpenStreetMap
                  </a>{" "}
                  (ODbL)
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
                  </a>{" "}
                  (ODbL)
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
