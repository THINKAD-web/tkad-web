"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, Loader2, Plus, RefreshCw } from "lucide-react";
import {
  REPORT_CATEGORY_ORDER,
  labelForReportCategory,
} from "@/lib/report-category";
import type { ReportCategory } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminReportRow = {
  id: string;
  slug: string;
  title: string;
  category: ReportCategory;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

const emptyForm = {
  slug: "",
  title: "",
  summary: "",
  content: "",
  category: "TREND" as ReportCategory,
  tags: "",
  thumbnail: "",
  published: false,
};

export default function AdminReportsPage() {
  const pathname = usePathname();
  const locale = useMemo(() => pathname.split("/")[1] || "ko", [pathname]);
  const [rows, setRows] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", { credentials: "include" });
      const data = (await res.json()) as { reports?: AdminReportRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "load failed");
      setRows(data.reports ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          thumbnail: form.thumbnail || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "create failed");
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "create failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(row: AdminReportRow) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !row.published }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">트렌드 리포트</h1>
          <p className="text-sm text-muted-foreground">
            /report 공개 콘텐츠 발행 (SEO·인사이트)
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          새로고침
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            새 리포트
          </CardTitle>
          <CardDescription>slug는 URL에 사용됩니다 (/report/[slug])</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm sm:col-span-1">
              slug
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-1">
              카테고리
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as ReportCategory,
                  }))
                }
                className="rounded-md border bg-background px-3 py-2"
              >
                {REPORT_CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {labelForReportCategory(c, true)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              제목
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              요약
              <textarea
                required
                rows={2}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              본문 (Markdown)
              <textarea
                required
                rows={8}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="font-mono rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              태그 (쉼표 구분)
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              썸네일 URL
              <input
                value={form.thumbnail}
                onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) =>
                  setForm((f) => ({ ...f, published: e.target.checked }))
                }
              />
              생성 즉시 공개
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                저장
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">발행 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 리포트가 없습니다.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {labelForReportCategory(r.category, true)} · {r.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void togglePublish(r)}
                      className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                    >
                      {r.published ? "비공개" : "공개"}
                    </button>
                    {r.published ? (
                      <a
                        href={`/${locale}/report/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                      >
                        보기
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
