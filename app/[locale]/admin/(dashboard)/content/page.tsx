"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";

type ContentKind = "trend_report" | "education_article" | "guide_article";

type Row = {
  id: string;
  kind: ContentKind;
  status: string;
  titleKo?: string;
  label: string;
  slug?: string | null;
  month?: string | null;
  scheduledAt?: string | null;
  updatedAt: string;
  generationMethod?: string;
};

const KIND_LABEL: Record<ContentKind, string> = {
  trend_report: "트렌드 리포트",
  education_article: "교육 콘텐츠",
  guide_article: "광고주 가이드",
};

export default function AdminContentPage() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";
  const base = `/${locale}/admin/content`;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/content", { credentials: "include" });
      if (!res.ok) {
        setError("목록을 불러오지 못했습니다.");
        return;
      }
      const data = await res.json();
      const merged: Row[] = [
        ...(data.trendReports ?? []),
        ...(data.educationArticles ?? []),
        ...(data.guideArticles ?? []),
      ].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setRows(merged);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const drafts = useMemo(
    () => rows.filter((r) => r.status === "draft" || r.status === "reviewed"),
    [rows],
  );
  const published = useMemo(
    () => rows.filter((r) => r.status === "published"),
    [rows],
  );

  const statusBadge = (s: string) => {
    const cls =
      s === "published"
        ? "bg-emerald-100 text-emerald-800"
        : s === "reviewed"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800";
    return (
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
        {s}
      </span>
    );
  };

  const renderList = (items: Row[], empty: string) => (
    <ul className="space-y-2 text-sm">
      {items.length === 0 ? (
        <li className="text-muted-foreground">{empty}</li>
      ) : (
        items.map((r) => (
          <li
            key={`${r.kind}-${r.id}`}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/15 py-2"
          >
            <span className="font-medium text-foreground">
              <span className="mr-2 font-display text-xs font-medium uppercase text-muted-foreground">
                {KIND_LABEL[r.kind]}
              </span>
              {r.label}
              {r.scheduledAt ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  예약 {new Date(r.scheduledAt).toLocaleString("ko-KR")}
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-2">
              {statusBadge(r.status)}
              <Button variant="outline" size="sm" asChild>
                <Link href={`${base}/edit/${r.id}?type=${r.kind}`}>편집</Link>
              </Button>
            </span>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <div className="space-y-8 p-6 text-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <p className="tkad-type-label text-muted-foreground">
            [ CONTENT CMS ]
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">콘텐츠 관리</h1>
          <p className="mt-1 tkad-type-caption text-muted-foreground">
            AI 자동 생성 초안 검토 · 편집 · 발행
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded border border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg">검토 대기 (Draft)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
            </div>
          ) : (
            renderList(drafts, "대기 중인 초안이 없습니다.")
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-lg">게시됨</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? null : renderList(published, "게시된 콘텐츠가 없습니다.")}
        </CardContent>
      </Card>
    </div>
  );
}
