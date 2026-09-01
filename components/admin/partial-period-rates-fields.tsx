"use client";

import { Input } from "@/components/ui/input";
import type { PartialPeriodRatesDraft } from "@/lib/media-partial-period-rates";

const PARTIAL_PERIOD_RATE_UI: {
  key: keyof PartialPeriodRatesDraft;
  label: string;
}[] = [
  { key: "1day", label: "1일" },
  { key: "3days", label: "3일" },
  { key: "5days", label: "5일" },
  { key: "7days", label: "7일" },
  { key: "15days", label: "15일" },
  { key: "30days", label: "30일" },
];

export function PartialPeriodRatesFields({
  draft,
  onChange,
  compact = false,
}: {
  draft: PartialPeriodRatesDraft;
  onChange: (next: PartialPeriodRatesDraft) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <p className="tkad-type-note font-medium text-muted-foreground">
        부분기간 요율 (%)
      </p>
      <p className="tkad-type-note leading-relaxed text-muted-foreground">
        비워두면 기존 선형/고정 로직 사용. 패키지 단가 대비 집행 기간 비율(예: 15일
        60% → 0.6). 운영 단위: 1·3·5·7·15·30일.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PARTIAL_PERIOD_RATE_UI.map(({ key, label }) => (
          <div key={key}>
            <label className="mb-0.5 block tkad-type-note text-muted-foreground">
              {label}
            </label>
            <div className="relative">
              <Input
                className="h-8 pr-7 text-sm tabular-nums"
                inputMode="decimal"
                placeholder="—"
                value={draft[key]}
                onChange={(e) =>
                  onChange({ ...draft, [key]: e.target.value })
                }
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 tkad-type-note text-muted-foreground">
                %
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
