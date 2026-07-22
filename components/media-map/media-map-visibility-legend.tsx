"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { visibilityPinLegendEntries } from "@/lib/map-pin-visibility-colors";
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
  const entries = visibilityPinLegendEntries(forLightMapTiles);

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
          <span
            className="h-3 w-3 shrink-0 rounded-full border"
            style={{
              backgroundColor: entries[4]?.fill ?? "#22D3EE",
              borderColor: entries[4]?.stroke ?? "#ff6200",
            }}
            aria-hidden
          />
          {isKo ? "가시성" : "Visibility"}
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
          <ul className="space-y-1">
            {entries.map((tier) => (
              <li
                key={tier.tier}
                className="tkad-type-note flex items-center gap-2 leading-tight text-tkad-secondary"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full border"
                  style={{
                    backgroundColor: tier.fill,
                    borderColor: tier.stroke,
                  }}
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
            {isKo ? "진할수록 높은 점수" : "Darker = higher score"}
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
