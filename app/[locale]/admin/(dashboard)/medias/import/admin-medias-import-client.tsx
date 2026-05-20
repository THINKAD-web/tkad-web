"use client";

import { useMemo, useState, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminFetchJson } from "@/lib/admin-client-fetch";
import {
  mediaCsvTemplateUtf8,
  parseMediaCsv,
  type MediaCsvRow,
  type MediaCsvRowError,
} from "@/lib/admin-media-csv";

type ImportOutcome =
  | { kind: "created"; rowIndex: number; id: string; name: string }
  | { kind: "failed"; rowIndex: number; name: string; error: string };

export default function AdminMediasImportClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    outcomes: ImportOutcome[];
    errors: MediaCsvRowError[];
  } | null>(null);

  const parsed = useMemo(() => {
    if (!csvText.trim()) return null;
    return parseMediaCsv(csvText);
  }, [csvText]);

  const loadFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setResult(null);
    const text = await f.text();
    setCsvText(text);
  }, []);

  const downloadTemplate = () => {
    const blob = new Blob([mediaCsvTemplateUtf8()], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "thinkad-media-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async (dryRun: boolean) => {
    if (!csvText.trim()) {
      setError("CSV 파일을 선택하세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    if (!dryRun) setResult(null);
    try {
      const res = await adminFetchJson("/api/admin/medias/import-csv", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, dryRun }),
      });
      if (!res.ok) {
        setError(res.message || "가져오기에 실패했습니다.");
        return;
      }
      const data = res.data as {
        error?: string;
        preview?: MediaCsvRow[];
        errors?: MediaCsvRowError[];
        outcomes?: ImportOutcome[];
        counts?: { created?: number; failed?: number };
      };
      if (dryRun) {
        setResult({ outcomes: [], errors: data.errors ?? [] });
        return;
      }
      setResult({
        outcomes: data.outcomes ?? [],
        errors: data.errors ?? [],
      });
      if ((data.counts?.created ?? 0) > 0) {
        router.push("/admin/medias");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 text-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/medias">
            <ArrowLeft className="mr-1 h-4 w-4" />
            매체 목록
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">CSV 일괄 등록</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            매체명, 유형, 주소, 월단가, 규격, 노출수, 설명 · 주소는 저장 시 카카오로
            좌표 변환
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. 템플릿</CardTitle>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            CSV 템플릿 다운로드
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. 업로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
            }}
          />
          {file ? (
            <p className="text-sm text-muted-foreground">파일: {file.name}</p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting || !csvText.trim()}
              onClick={() => void runImport(true)}
            >
              미리보기 (검증)
            </Button>
            <Button
              type="button"
              disabled={submitting || !csvText.trim()}
              onClick={() => void runImport(false)}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              일괄 등록
            </Button>
          </div>
        </CardContent>
      </Card>

      {parsed && parsed.rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              미리보기 ({parsed.rows.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-2 py-2">행</th>
                  <th className="px-2 py-2">매체명</th>
                  <th className="px-2 py-2">유형</th>
                  <th className="px-2 py-2">주소</th>
                  <th className="px-2 py-2">월단가</th>
                  <th className="px-2 py-2">규격</th>
                  <th className="px-2 py-2">노출수</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r) => (
                  <tr key={r.rowIndex} className="border-b border-border/50">
                    <td className="px-2 py-2 font-mono text-xs">{r.rowIndex}</td>
                    <td className="px-2 py-2">{r.name}</td>
                    <td className="px-2 py-2">{r.type}</td>
                    <td className="max-w-[200px] truncate px-2 py-2" title={r.location}>
                      {r.location}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {r.price.toLocaleString()}
                    </td>
                    <td className="px-2 py-2">{r.spec || "—"}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {r.exposure?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {parsed && parsed.errors.length > 0 ? (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-amber-800">
              <AlertCircle className="h-5 w-5" />
              오류 행 ({parsed.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {parsed.errors.map((e, i) => (
                <li key={`${e.rowIndex}-${e.field}-${i}`} className="text-amber-900">
                  행 {e.rowIndex} · {e.field}: {e.message}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {result && result.outcomes.length > 0 ? (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              등록 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {result.outcomes.map((o) => (
                <li key={`${o.kind}-${o.rowIndex}`}>
                  {o.kind === "created"
                    ? `✓ 행 ${o.rowIndex}: ${o.name}`
                    : `✗ 행 ${o.rowIndex}: ${o.name} — ${"error" in o ? o.error : ""}`}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
