"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PeriodRow = {
  id: string;
  startDate: string;
  endDate: string;
  status: "AVAILABLE" | "BOOKED" | "RESERVED";
  note: string | null;
};

type Props = {
  mediaId: string | null;
  month: Date;
};

function monthParam(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function AdminMediaAvailabilityPanel({ mediaId, month }: Props) {
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    status: "BOOKED" as PeriodRow["status"],
    note: "",
  });

  const load = useCallback(async () => {
    if (!mediaId) {
      setPeriods([]);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/availability?mediaId=${encodeURIComponent(mediaId)}&month=${monthParam(month)}`,
      );
      const data = (await res.json()) as {
        periods?: PeriodRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setPeriods(data.periods ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load failed");
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [mediaId, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const addPeriod = async () => {
    if (!mediaId || !form.startDate || !form.endDate) return;
    setErr(null);
    const res = await fetch("/api/admin/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mediaId,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        note: form.note || null,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setErr(data.error ?? "등록 실패");
      return;
    }
    setForm({ startDate: "", endDate: "", status: "BOOKED", note: "" });
    await load();
  };

  const delPeriod = async (id: string) => {
    await fetch(`/api/admin/availability/${id}`, { method: "DELETE" });
    await load();
  };

  if (!mediaId) return null;

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="mb-2 text-sm font-semibold">가용 캘린더 슬롯 (공개 캘린더)</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        매체 상세 캘린더에 표시됩니다. BOOKED=집행, RESERVED=협의, AVAILABLE=가용
        표시.
      </p>
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <Input
          type="date"
          value={form.startDate}
          onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
        />
        <Input
          type="date"
          value={form.endDate}
          onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
        />
        <select
          className="rounded border px-2 py-2 text-sm sm:col-span-2"
          value={form.status}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              status: e.target.value as PeriodRow["status"],
            }))
          }
        >
          <option value="AVAILABLE">가용 (AVAILABLE)</option>
          <option value="BOOKED">집행 (BOOKED)</option>
          <option value="RESERVED">협의 (RESERVED)</option>
        </select>
        <Input
          className="sm:col-span-2"
          placeholder="메모 (선택)"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
      </div>
      <Button type="button" size="sm" onClick={() => void addPeriod()}>
        슬롯 추가
      </Button>
      {err ? <p className="mt-2 text-xs text-rose-700">{err}</p> : null}
      {loading ? (
        <p className="mt-2 text-xs text-muted-foreground">불러오는 중…</p>
      ) : (
        <ul className="mt-3 space-y-2 text-xs">
          {periods.length === 0 ? (
            <li className="text-muted-foreground">이 달 등록된 슬롯 없음</li>
          ) : (
            periods.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded border p-2"
              >
                <span>
                  {p.startDate} ~ {p.endDate}{" "}
                  <span className="font-mono font-semibold">{p.status}</span>
                  {p.note ? ` — ${p.note}` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  onClick={() => void delPeriod(p.id)}
                >
                  삭제
                </Button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
