"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Download, Filter } from "lucide-react";

type CalEvent = {
  id: string;
  campaignId: string;
  title: string;
  start: string;
  end: string;
  status: string;
  clientCompany: string;
  regions: string[];
  mediaNames: string[];
  kind: string;
};

const STATUS_OPTS = [
  "",
  "proposal",
  "negotiation",
  "contract",
  "production",
  "airing",
  "completed",
] as const;

export function AdminCampaignCalendar() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (region) q.set("region", region);
    if (status) q.set("status", status);
    const res = await fetch(`/api/admin/calendar?${q}`, { cache: "no-store" });
    const data = await res.json();
    if (data.events) {
      setEvents(data.events as CalEvent[]);
      setRegions((data.regions as string[]) ?? []);
    }
    setLoading(false);
  }, [region, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const byMonth = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      const key = e.start.slice(0, 7);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const icalUrl = useMemo(() => {
    const q = new URLSearchParams({ format: "ical" });
    if (region) q.set("region", region);
    if (status) q.set("status", status);
    return `/api/admin/calendar?${q}`;
  }, [region, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Calendar className="h-6 w-6" />
            캠페인 캘린더
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            전체 집행 일정 · 필터 · Google Calendar(iCal) 연동
          </p>
        </div>
        <a
          href={icalUrl}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 tkad-type-title hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          iCal보내기
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm">
          지역
          <select
            className="ml-2 rounded-md border px-2 py-1"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">전체</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          상태
          <select
            className="ml-2 rounded-md border px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTS.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "전체"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : byMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">일정이 없습니다.</p>
          ) : (
            byMonth.map(([month, list]) => (
              <section key={month} className="rounded-xl border bg-card p-4">
                <h2 className="text-sm font-bold text-muted-foreground">
                  {month}
                </h2>
                <ul className="mt-3 space-y-2">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(e)}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-muted ${ selected?.id === e.id ? "border-primary bg-muted" : "" }`}
                      >
                        <span className="font-semibold">{e.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {e.start.slice(0, 10)} ~ {e.end.slice(0, 10)} · {e.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <aside className="rounded-xl border bg-card p-4 lg:sticky lg:top-4 lg:self-start">
          <h3 className="font-bold">상세</h3>
          {selected ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">캠페인</dt>
                <dd className="font-semibold">{selected.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">광고주</dt>
                <dd>{selected.clientCompany}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">기간</dt>
                <dd>
                  {selected.start.slice(0, 10)} ~ {selected.end.slice(0, 10)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">상태</dt>
                <dd>{selected.status}</dd>
              </div>
              {selected.regions.length > 0 ? (
                <div>
                  <dt className="text-muted-foreground">지역</dt>
                  <dd>{selected.regions.join(", ")}</dd>
                </div>
              ) : null}
              {selected.mediaNames.length > 0 ? (
                <div>
                  <dt className="text-muted-foreground">매체</dt>
                  <dd>{selected.mediaNames.join(", ")}</dd>
                </div>
              ) : null}
              <a
                href={`/ko/admin/campaigns`}
                className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
              >
                캠페인 관리 →
              </a>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              왼쪽 일정을 클릭하면 상세가 표시됩니다.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
