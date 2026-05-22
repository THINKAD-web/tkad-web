"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Tags } from "lucide-react";
import { adminFetchJson } from "@/lib/admin-client-fetch";

type Props = {
  lowQualityCount: number;
  qualityFilter: "all" | "low";
  onQualityFilterChange: (v: "all" | "low") => void;
  onBatchComplete: () => void;
};

export function AdminMediaQualityToolbar({
  lowQualityCount,
  qualityFilter,
  onQualityFilterChange,
  onBatchComplete,
}: Props) {
  const [geocodeBusy, setGeocodeBusy] = useState(false);
  const [regionBusy, setRegionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runGeocode = async () => {
    setGeocodeBusy(true);
    setMessage(null);
    try {
      const res = await adminFetchJson("/api/admin/media/geocode-missing", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 80 }),
      });
      if (!res.ok) {
        setMessage(res.message ?? "지오코딩 실패");
        return;
      }
      const d = res.data as {
        updated?: number;
        failed?: number;
        scanned?: number;
      };
      setMessage(
        `위경도 보완: ${d.updated ?? 0}건 성공 · ${d.failed ?? 0}건 실패 (스캔 ${d.scanned ?? 0})`,
      );
      onBatchComplete();
    } finally {
      setGeocodeBusy(false);
    }
  };

  const runNormalizeRegions = async () => {
    setRegionBusy(true);
    setMessage(null);
    try {
      const res = await adminFetchJson("/api/admin/medias/normalize-regions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyMissingZone: false }),
      });
      if (!res.ok) {
        setMessage(res.message ?? "권역 정규화 실패");
        return;
      }
      const d = res.data as { updated?: number; scanned?: number };
      setMessage(
        `권역 정규화: ${d.updated ?? 0}건 갱신 (전체 ${d.scanned ?? 0})`,
      );
      onBatchComplete();
    } finally {
      setRegionBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-muted/15 px-2 py-2 sm:px-2.5">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        데이터 품질
      </p>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">필터</span>
          {(
            [
              { value: "all" as const, label: "전체" },
              {
                value: "low" as const,
                label: `품질 낮음 (${lowQualityCount})`,
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onQualityFilterChange(opt.value)}
              className={`rounded-full px-2 py-1 text-[11px] font-semibold transition-colors sm:px-2.5 sm:text-xs ${
                qualityFilter === opt.value
                  ? "border-2 border-border bg-foreground text-background"
                  : "border-2 border-border bg-card text-foreground hover:bg-muted/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={geocodeBusy}
            onClick={() => void runGeocode()}
          >
            {geocodeBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            위경도 보완
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={regionBusy}
            onClick={() => void runNormalizeRegions()}
          >
            {regionBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Tags className="h-3.5 w-3.5" />
            )}
            권역 정규화
          </Button>
        </div>
      </div>
      {message ? (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

export function MediaQualityScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : score >= 60
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-red-500/15 text-red-700 dark:text-red-300";
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${tone}`}
      title="데이터 완성도"
    >
      {score}%
    </span>
  );
}
