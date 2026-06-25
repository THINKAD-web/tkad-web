"use client";

import { visibilityPinLegendEntries } from "@/lib/map-pin-visibility-colors";
import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  className?: string;
};

export function MediaMapVisibilityLegend({ isKo = true, className }: Props) {
  const entries = visibilityPinLegendEntries();

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200/90 bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm",
        "dark:border-white/12 dark:bg-[#0a0a12]/90",
        className,
      )}
      aria-label={isKo ? "가시성 점수 범례" : "Visibility score legend"}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
        {isKo ? "가시성" : "Visibility"}
      </p>
      <ul className="space-y-1">
        {entries.map((tier) => (
          <li key={tier.tier} className="flex items-center gap-2 text-[11px] leading-tight text-gray-700 dark:text-white/75">
            <span
              className="h-3 w-3 shrink-0 rounded-full border"
              style={{
                backgroundColor: tier.fill,
                borderColor: tier.stroke,
              }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="font-medium text-gray-900 dark:text-white/90">
                {isKo ? tier.labelKo : tier.labelEn}
              </span>
              {tier.tier > 0 ? (
                <span className="text-gray-500 dark:text-white/45">
                  {" "}
                  ({isKo ? tier.rangeLabelKo : tier.rangeLabelEn})
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[10px] text-gray-400 dark:text-white/35">
        {isKo ? "진할수록 높은 점수" : "Darker = higher score"}
      </p>
    </div>
  );
}
