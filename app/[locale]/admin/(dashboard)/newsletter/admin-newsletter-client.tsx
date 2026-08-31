"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Send, Users, X } from "lucide-react";
import { useToast } from "@/components/toast-provider";

type Subscriber = {
  id: string;
  email: string;
  locale: string;
  source: string | null;
  isActive: boolean;
  unsubscribedAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
};

type Dispatch = {
  id: string;
  subject: string;
  bodyMd: string;
  localeFilter: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export function AdminNewsletterClient() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"subscribers" | "dispatches">("subscribers");
  const [statusFilter, setStatusFilter] = useState<"active" | "unsubscribed" | "all">(
    "active",
  );
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [dispLoading, setDispLoading] = useState(false);

  const [subject, setSubject] = useState("");
  const [bodyMd, setBodyMd] = useState("");
  const [localeFilter, setLocaleFilter] = useState<"ko" | "en" | "all">("all");
  const [notes, setNotes] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [dryRunInfo, setDryRunInfo] = useState<{
    recipientCount: number;
    sample: string[];
  } | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setSubLoading(true);
    try {
      const r = await fetch(
        `/api/admin/newsletter/subscribers?status=${statusFilter}`,
        { cache: "no-store" },
      );
      const d = await r.json();
      setSubscribers((d.items ?? []) as Subscriber[]);
    } finally {
      setSubLoading(false);
    }
  }, [statusFilter]);

  const fetchDispatches = useCallback(async () => {
    setDispLoading(true);
    try {
      const r = await fetch("/api/admin/newsletter/dispatches", {
        cache: "no-store",
      });
      const d = await r.json();
      setDispatches((d.items ?? []) as Dispatch[]);
    } finally {
      setDispLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);
  useEffect(() => {
    if (tab === "dispatches") void fetchDispatches();
  }, [tab, fetchDispatches]);

  const removeSubscriber = async (id: string) => {
    if (!confirm("이 구독자를 해지 처리하시겠습니까?")) return;
    const r = await fetch(
      `/api/admin/newsletter/subscribers?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (r.ok) {
      toast("success", "해지 처리했습니다.");
      void fetchSubscribers();
    } else {
      toast("error", "해지 처리에 실패했습니다.");
    }
  };

  const dryRun = async () => {
    if (!subject.trim() || !bodyMd.trim()) {
      toast("warning", "제목과 본문을 입력해주세요.");
      return;
    }
    setSendBusy(true);
    setDryRunInfo(null);
    try {
      const r = await fetch("/api/admin/newsletter/dispatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          bodyMd,
          localeFilter,
          notes: notes.trim() || undefined,
          dryRun: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast("error", `미리보기 실패: ${d?.error ?? r.status}`);
        return;
      }
      setDryRunInfo({
        recipientCount: d.recipientCount,
        sample: d.sample ?? [],
      });
      toast("success", `발송 대상 ${d.recipientCount}명을 확인했습니다.`);
    } finally {
      setSendBusy(false);
    }
  };

  const send = async () => {
    if (!subject.trim() || !bodyMd.trim()) {
      toast("warning", "제목과 본문을 입력해주세요.");
      return;
    }
    if (!confirm("실제로 발송하시겠습니까? 되돌릴 수 없습니다.")) return;
    setSendBusy(true);
    try {
      const r = await fetch("/api/admin/newsletter/dispatches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          bodyMd,
          localeFilter,
          notes: notes.trim() || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast("error", `발송 실패: ${d?.error ?? r.status}`);
        return;
      }
      toast(
        "success",
        `발송 완료. 성공 ${d.successCount}/실패 ${d.failedCount} (대상 ${d.recipientCount}명)`,
      );
      setSubject("");
      setBodyMd("");
      setNotes("");
      setDryRunInfo(null);
      void fetchDispatches();
    } finally {
      setSendBusy(false);
    }
  };

  const activeCount = useMemo(
    () => subscribers.filter((s) => s.isActive).length,
    [subscribers],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          뉴스레터 관리
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          트렌드 리포트 뉴스레터의 구독자·발송 기록을 관리합니다.
        </p>
      </header>

      <nav className="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setTab("subscribers")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 tkad-type-label transition-colors ${
            tab === "subscribers"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          구독자
        </button>
        <button
          type="button"
          onClick={() => setTab("dispatches")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 tkad-type-label transition-colors ${
            tab === "dispatches"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          발송 / 이력
        </button>
      </nav>

      {tab === "subscribers" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["active", "활성"],
                ["unsubscribed", "해지"],
                ["all", "전체"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatusFilter(k)}
                className={`rounded-full border px-3 py-1 tkad-type-label transition-colors ${
                  statusFilter === k
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto tkad-type-label text-muted-foreground">
              활성 {activeCount} · 합계 {subscribers.length}
            </span>
          </div>

          <div className="overflow-hidden rounded-md border border-border bg-card">
            {subLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : subscribers.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                해당하는 구독자가 없습니다.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground">
                      <th className="px-3 py-2 tkad-type-label">
                        Email
                      </th>
                      <th className="px-3 py-2 tkad-type-label">
                        Locale
                      </th>
                      <th className="px-3 py-2 tkad-type-label">
                        Source
                      </th>
                      <th className="px-3 py-2 tkad-type-label">
                        Status
                      </th>
                      <th className="px-3 py-2 tkad-type-label">
                        Last sent
                      </th>
                      <th className="px-3 py-2 tkad-type-label">
                        Joined
                      </th>
                      <th className="px-3 py-2 tkad-type-label" />
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr
                        key={s.id}
                        className="border-t border-border/40 odd:bg-card even:bg-muted/40"
                      >
                        <td className="px-3 py-2 font-bold text-foreground">
                          {s.email}
                        </td>
                        <td className="px-3 py-2 tkad-type-caption text-muted-foreground">
                          {s.locale}
                        </td>
                        <td className="px-3 py-2 tkad-type-caption text-muted-foreground">
                          {s.source ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 tkad-type-label ${
                              s.isActive
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            {s.isActive ? "active" : "unsubscribed"}
                          </span>
                        </td>
                        <td className="px-3 py-2 tkad-type-caption text-muted-foreground">
                          {s.lastSentAt
                            ? new Date(s.lastSentAt).toLocaleDateString("ko-KR")
                            : "—"}
                        </td>
                        <td className="px-3 py-2 tkad-type-caption text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {s.isActive ? (
                            <button
                              type="button"
                              onClick={() => removeSubscriber(s.id)}
                              className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 tkad-type-label text-muted-foreground hover:border-destructive hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                              해지
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "dispatches" ? (
        <section className="space-y-5">
          <div className="rounded-md border border-border bg-card p-4 sm:p-5">
            <h2 className="text-base font-bold tracking-tight text-foreground">
              새 뉴스레터 발송
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              저장 후 즉시 활성 구독자에게 발송됩니다 (소규모 동기 발송 — 큐 도입 전).
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="block">
                <span className="tkad-type-label text-muted-foreground">
                  제목
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="2026년 5월 OOH 트렌드 리포트"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="tkad-type-label text-muted-foreground">
                  본문 (마크다운: # ## ### · - 단락)
                </span>
                <textarea
                  rows={10}
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                  maxLength={20_000}
                  placeholder={`# 5월 OOH 트렌드\n\n## 인기 매체\n- 강남대로 미디어월\n- 시청역 LED\n\n## 평균 CPM 추이\n…`}
                  className="mt-1 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 tkad-type-label text-muted-foreground">
                  Locale
                  <select
                    value={localeFilter}
                    onChange={(e) =>
                      setLocaleFilter(e.target.value as typeof localeFilter)
                    }
                    className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
                  >
                    <option value="all">all</option>
                    <option value="ko">ko</option>
                    <option value="en">en</option>
                  </select>
                </label>
                <label className="inline-flex flex-1 items-center gap-2 tkad-type-label text-muted-foreground">
                  Notes
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="발송 메모(외부 노출 X)"
                    className="h-8 flex-1 rounded border border-border bg-card px-2 text-xs text-foreground"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={dryRun}
                  disabled={sendBusy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 tkad-type-label text-foreground hover:bg-muted disabled:opacity-50"
                >
                  대상 미리보기
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={sendBusy}
                  className="inline-flex items-center gap-1.5 rounded-md border-2 border-primary bg-primary px-4 py-2 tkad-type-label text-primary-foreground hover:opacity-95 disabled:opacity-50"
                >
                  {sendBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  발송
                </button>
              </div>
              {dryRunInfo ? (
                <div className="rounded-md border border-primary bg-primary/10 p-3 text-xs">
                  발송 대상 {dryRunInfo.recipientCount}명. 샘플:{" "}
                  {dryRunInfo.sample.join(", ") || "—"}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                발송 이력
              </h2>
              <span className="tkad-type-label text-muted-foreground">
                최근 {dispatches.length}건
              </span>
            </header>
            {dispLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : dispatches.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                아직 발송 이력이 없습니다.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {dispatches.map((d) => (
                  <li key={d.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{d.subject}</span>
                      <span className="tkad-type-label text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString("ko-KR")}
                      </span>
                      <span className="ml-auto tkad-type-caption tabular-nums">
                        성공 {d.successCount}/{d.recipientCount}
                        {d.failedCount > 0 ? ` · 실패 ${d.failedCount}` : ""}
                      </span>
                    </div>
                    <p className="line-clamp-2 tkad-type-caption text-muted-foreground">
                      {d.bodyMd.slice(0, 240)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
