"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AiGenerationProgress } from "@/components/admin/ai-generation-progress";
import { consumeAdminSse } from "@/lib/admin-sse";
import type { TrendReportPipelineEvent } from "@/lib/insights/trend-report-pipeline";

type LogLine = { id: string; text: string; tone?: "default" | "ok" | "error" };

function linesFromBullets(arr: string[] | undefined): string {
  return (arr ?? []).join("\n");
}

function bulletsFromLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminReportNewClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const logId = useId();
  const locale = pathname.split("/")[1] || "ko";
  const editId = searchParams.get("edit")?.trim() ?? "";

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [reportId, setReportId] = useState(editId);
  const [status, setStatus] = useState("draft");
  const [titleKo, setTitleKo] = useState("");
  const [contentKo, setContentKo] = useState("");
  const [summaryLines, setSummaryLines] = useState("");
  const [marketLines, setMarketLines] = useState("");
  const [doohLines, setDoohLines] = useState("");

  const [loading, setLoading] = useState(!!editId);
  const [genBusy, setGenBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const pushLog = useCallback(
    (text: string, tone: LogLine["tone"] = "default") => {
      setLogs((prev) => [
        ...prev,
        { id: `${logId}-${prev.length}`, text, tone },
      ]);
    },
    [logId],
  );

  const applyReport = useCallback(
    (r: {
      id: string;
      status?: string;
      titleKo: string;
      contentKo: string;
      summaryKo?: string[];
      marketTrendKo?: string[];
      doohTrendKo?: string[];
      month?: string | null;
    }) => {
      setReportId(r.id);
      if (r.status) setStatus(r.status);
      if (r.month) setMonth(r.month);
      setTitleKo(r.titleKo);
      setContentKo(r.contentKo);
      setSummaryLines(linesFromBullets(r.summaryKo));
      setMarketLines(linesFromBullets(r.marketTrendKo));
      setDoohLines(linesFromBullets(r.doohTrendKo));
    },
    [],
  );

  const loadReport = useCallback(async () => {
    if (!editId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/trend-reports/${editId}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "불러오기 실패");
        return;
      }
      applyReport(data.trendReport);
      setReportId(editId);
    } catch {
      setErr("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [editId, applyReport]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const runGenerate = async (regenerate: boolean) => {
    setGenBusy(true);
    setErr(null);
    setMsg(null);
    setLogs([]);
    pushLog(regenerate ? "AI 초안 재생성 시작" : "AI 초안 생성 시작");

    try {
      const res = await fetch("/api/admin/reports/generate-ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          stream: true,
          reportId: regenerate && reportId ? reportId : undefined,
          regenerate,
        }),
      });

      if (!res.ok && res.headers.get("content-type")?.includes("json")) {
        const data = await res.json().catch(() => ({}));
        setErr(typeof data.error === "string" ? data.error : "생성 실패");
        pushLog("생성 실패", "error");
        return;
      }

      if (!res.ok) {
        setErr(`생성 실패 (${res.status})`);
        pushLog(`HTTP ${res.status}`, "error");
        return;
      }

      await consumeAdminSse<TrendReportPipelineEvent>(res, (event) => {
        if (event.phase === "searching") {
          pushLog(event.message);
        } else if (event.phase === "sources") {
          pushLog(`참고 출처 ${event.count}건 수집`);
        } else if (event.phase === "generating" || event.phase === "saving") {
          pushLog(event.message);
        } else if (event.phase === "complete") {
          applyReport(event.trendReport);
          pushLog("초안 생성 완료 — 편집 후 발행하세요", "ok");
          setMsg("초안이 생성되었습니다. 내용을 검토한 뒤 발행하세요.");
          if (typeof window !== "undefined" && event.trendReport.id) {
            const url = new URL(window.location.href);
            url.searchParams.set("edit", event.trendReport.id);
            window.history.replaceState(null, "", url.toString());
          }
        } else if (event.phase === "error") {
          setErr(event.error);
          pushLog(event.error, "error");
        }
      });
    } catch {
      setErr("네트워크 오류");
      pushLog("네트워크 오류", "error");
    } finally {
      setGenBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!reportId) {
      setErr("먼저 AI 초안을 생성하세요.");
      return;
    }
    setSaveBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/trend-reports/${reportId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleKo,
          contentKo,
          summaryKo: bulletsFromLines(summaryLines),
          marketTrendKo: bulletsFromLines(marketLines),
          doohTrendKo: bulletsFromLines(doohLines),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "저장 실패");
        return;
      }
      setStatus(data.trendReport?.status ?? status);
      setMsg("임시 저장했습니다.");
    } catch {
      setErr("네트워크 오류");
    } finally {
      setSaveBusy(false);
    }
  };

  const publish = async () => {
    if (!reportId) {
      setErr("먼저 AI 초안을 생성하세요.");
      return;
    }
    setPublishBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const patchRes = await fetch(`/api/admin/trend-reports/${reportId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titleKo,
          contentKo,
          summaryKo: bulletsFromLines(summaryLines),
          marketTrendKo: bulletsFromLines(marketLines),
          doohTrendKo: bulletsFromLines(doohLines),
        }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        setErr(typeof data.error === "string" ? data.error : "저장 실패");
        return;
      }
      const res = await fetch(`/api/admin/content/${reportId}/publish`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "발행 실패");
        return;
      }
      setStatus("published");
      setMsg("발행했습니다.");
    } catch {
      setErr("네트워크 오류");
    } finally {
      setPublishBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        불러오는 중…
      </p>
    );
  }

  return (
    <div className="space-y-6 p-6 text-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/80">
            [ TREND REPORT ]
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            트렌드 리포트 작성
          </h1>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {`// Tavily 뉴스 + Claude 초안 → 검토 후 발행 · 상태: ${status}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${locale}/admin/ai-content`}>AI 콘텐츠 목록</Link>
          </Button>
        </div>
      </header>

      {err ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {err}
        </p>
      ) : null}
      {msg ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              대상 월
            </label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1 max-w-xs"
              disabled={genBusy || !!reportId}
            />
          </div>
          <Button
            type="button"
            disabled={genBusy}
            onClick={() => void runGenerate(false)}
            className="border-2 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20"
          >
            {genBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            AI 초안 생성
          </Button>
          {reportId ? (
            <Button
              type="button"
              variant="outline"
              disabled={genBusy}
              onClick={() => void runGenerate(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              재생성
            </Button>
          ) : null}
        </div>
        <div className="mt-4">
          <AiGenerationProgress lines={logs} busy={genBusy} />
        </div>
      </section>

      {reportId || titleKo ? (
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card/30 p-4">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            [ 초안 편집 ]
          </h2>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              제목
            </label>
            <Input
              value={titleKo}
              onChange={(e) => setTitleKo(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              핵심 요약 (줄당 1 bullet, 3줄 권장)
            </label>
            <Textarea
              value={summaryLines}
              onChange={(e) => setSummaryLines(e.target.value)}
              rows={4}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              본문 (Markdown, h2 3개 + 시사점)
            </label>
            <Textarea
              value={contentKo}
              onChange={(e) => setContentKo(e.target.value)}
              rows={18}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                시장 트렌드 bullets
              </label>
              <Textarea
                value={marketLines}
                onChange={(e) => setMarketLines(e.target.value)}
                rows={6}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                DOOH 트렌드 bullets
              </label>
              <Textarea
                value={doohLines}
                onChange={(e) => setDoohLines(e.target.value)}
                rows={6}
                className="mt-1 font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveBusy || publishBusy}
              onClick={() => void saveDraft()}
            >
              {saveBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              임시저장
            </Button>
            <Button
              type="button"
              disabled={saveBusy || publishBusy}
              onClick={() => void publish()}
            >
              {publishBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              발행
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
