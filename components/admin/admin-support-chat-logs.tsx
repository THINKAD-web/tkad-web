"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type LogRow = {
  id: string;
  sessionId: string;
  userId: string | null;
  locale: string;
  role: string;
  content: string;
  createdAt: string;
};

export function AdminSupportChatLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support-chat/logs?limit=80", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { logs: LogRow[] };
      setLogs(data.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-xl border-2 border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">지원 AI 채팅 로그</h2>
          <p className="text-xs text-muted-foreground">
            공개 위젯 AI 1차 응대 대화 (최근 80건)
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          새로고침
        </button>
      </div>
      <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto font-mono text-xs">
        {logs.map((l) => (
          <li
            key={l.id}
            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
          >
            <div className="flex flex-wrap gap-2 text-muted-foreground">
              <span>{l.role}</span>
              <span>{l.sessionId.slice(0, 16)}</span>
              <span>{new Date(l.createdAt).toLocaleString("ko-KR")}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-foreground">
              {l.content.slice(0, 500)}
            </p>
          </li>
        ))}
        {!loading && logs.length === 0 ? (
          <li className="text-muted-foreground">로그 없음</li>
        ) : null}
      </ul>
    </section>
  );
}
