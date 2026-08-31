"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  operatorManualChapters,
  OPERATOR_MANUAL_TITLE,
} from "@/lib/operator-manual-content";

type ManualStatus = {
  pdfUrl: string | null;
  generatedAt: string | null;
};

function formatGeneratedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminManualClient() {
  const [status, setStatus] = useState<ManualStatus>({
    pdfUrl: null,
    generatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/generate-manual", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "상태 조회 실패");
        return;
      }
      setStatus({
        pdfUrl: typeof data.pdfUrl === "string" ? data.pdfUrl : null,
        generatedAt:
          typeof data.generatedAt === "string" ? data.generatedAt : null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runGenerate = async () => {
    setGenerating(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/generate-manual", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "PDF 생성 실패");
        return;
      }
      setStatus({
        pdfUrl: typeof data.pdfUrl === "string" ? data.pdfUrl : null,
        generatedAt:
          typeof data.generatedAt === "string" ? data.generatedAt : null,
      });
      setMsg("운영 매뉴얼 PDF가 생성되었습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = () => {
    if (!status.pdfUrl) return;
    window.open(status.pdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="tkad-type-label text-muted-foreground">
          [ OPS / MANUAL ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {OPERATOR_MANUAL_TITLE}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A4 세로 PDF · THINKAD 로고 표지 · 목차 · 섹션별 본문 · 페이지 번호.
          Cloudinary 업로드 후 다운로드합니다.
        </p>
      </header>

      <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            disabled={!status.pdfUrl || loading}
            onClick={downloadPdf}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            운영 매뉴얼 다운로드 (PDF)
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={generating}
            onClick={() => void runGenerate()}
            className="gap-2"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            PDF 새로 생성
          </Button>
        </div>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">최종 생성</dt>
            <dd className="font-medium">
              {loading ? "…" : formatGeneratedAt(status.generatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">파일 상태</dt>
            <dd className="font-medium">
              {loading
                ? "…"
                : status.pdfUrl
                  ? "다운로드 가능"
                  : "아직 생성되지 않음"}
            </dd>
          </div>
        </dl>

        {err ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? (
          <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">
            {msg}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <FileText className="h-5 w-5" />
          매뉴얼 목차 미리보기
        </h2>
        <div className="space-y-6 rounded-2xl border border-border/60 bg-card/30 p-5">
          {operatorManualChapters.map((chapter) => (
            <div key={chapter.id}>
              <h3 className="font-bold text-primary">{chapter.title}</h3>
              <ul className="mt-2 space-y-3">
                {chapter.subsections.map((sub) => (
                  <li key={sub.id}>
                    <p className="tkad-type-title">{sub.title}</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
                      {sub.bullets.map((b, i) => (
                        <li key={`${sub.id}-${i}`}>{b.text}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
