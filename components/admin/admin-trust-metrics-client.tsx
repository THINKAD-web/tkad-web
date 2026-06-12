"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Metrics = { mediaCount: number; brandCount: number; campaignCount: number };

const FIELDS: { key: keyof Metrics; label: string }[] = [
  { key: "mediaCount", label: "검증 매체 수" },
  { key: "campaignCount", label: "누적 캠페인 수" },
  { key: "brandCount", label: "활성 브랜드 수" },
];

export function AdminTrustMetricsClient() {
  const [current, setCurrent] = useState<Metrics | null>(null);
  const [override, setOverride] = useState<Partial<Metrics>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trust-metrics", { cache: "no-store" });
      const d = (await res.json()) as { current: Metrics | null; override: Partial<Metrics> };
      setCurrent(d.current);
      setOverride(d.override ?? {});
      setInputs({
        mediaCount: d.override?.mediaCount != null ? String(d.override.mediaCount) : "",
        brandCount: d.override?.brandCount != null ? String(d.override.brandCount) : "",
        campaignCount: d.override?.campaignCount != null ? String(d.override.campaignCount) : "",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/trust-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) {
        setSaved(true);
        await load();
      } else {
        window.alert(d.error || "저장 실패");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        {FIELDS.map((f) => {
          const auto = current?.[f.key] ?? 0;
          const isOverridden = override?.[f.key] != null;
          return (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  자동 집계: {auto.toLocaleString()}
                  {isOverridden ? " · (수동값 사용 중)" : " · (자동 사용 중)"}
                </p>
              </div>
              <input
                type="number"
                min={0}
                value={inputs[f.key] ?? ""}
                onChange={(e) =>
                  setInputs((s) => ({ ...s, [f.key]: e.target.value }))
                }
                placeholder={`자동 (${auto.toLocaleString()})`}
                className="w-40 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-sm outline-none dark:border-white/10"
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          저장
        </button>
        {saved ? <span className="text-xs text-emerald-600">저장됨 · 즉시 반영</span> : null}
        <span className="text-xs text-muted-foreground">
          빈 칸 = 자동 집계값 사용
        </span>
      </div>
    </div>
  );
}
