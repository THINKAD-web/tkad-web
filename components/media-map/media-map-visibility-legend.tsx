"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { visibilityPinLegendEntries } from "@/lib/map-pin-visibility-colors";
import { mapFloatingPanelClass } from "@/components/media-map/map-floating-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  className?: string;
};

export function MediaMapVisibilityLegend({ isKo = true, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const entries = visibilityPinLegendEntries();

  return (
    <div
      className={cn(
        mapFloatingPanelClass("pointer-events-auto overflow-hidden"),
        className,
      )}
      aria-label={isKo ? "가시성 점수 범례" : "Visibility score legend"}
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
              backgroundColor: entries[4]?.fill ?? "#FF6600",
              borderColor: entries[4]?.stroke ?? "#E55A00",
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
        </div>
      ) : null}
    </div>
  );
}
