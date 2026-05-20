"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";

type ContentKind = "trend_report" | "education_article" | "guide_article";

export default function AdminContentEditClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";
  const id = String(params.id ?? "");
  const typeRaw = searchParams.get("type")?.trim();
  const kind: ContentKind | null =
    typeRaw === "trend_report" ||
    typeRaw === "education_article" ||
    typeRaw === "guide_article"
      ? typeRaw
      : null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [excerptKo, setExcerptKo] = useState("");
  const [contentKo, setContentKo] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tagsLine, setTagsLine] = useState("");
  const [slug, setSlug] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [saveBusy, setSaveBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const apiBase =
    kind === "trend_report"
      ? `/api/admin/trend-reports/${id}`
      : kind === "education_article"
        ? `/api/admin/education-articles/${id}`
        : kind === "guide_article"
          ? `/api/admin/guide-articles/${id}`
          : "";

  const load = useCallback(async () => {
    if (!id || !kind) {
      setLoading(false);
      setErr("type 쿼리가 필요합니다 (?type=trend_report|education_article|guide_article)");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(apiBase, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "불러오기 실패");
        return;
      }
      const r =
        data.trendReport ?? data.educationArticle ?? data.guideArticle;
      setStatus(r.status ?? "");
      setTitleKo(r.titleKo ?? "");
      setExcerptKo(r.excerptKo ?? (r.summaryKo?.[0] ?? ""));
      setContentKo(r.contentKo ?? "");
      setMetaDescription(r.metaDescription ?? "");
      setTagsLine(Array.isArray(r.tags) ? r.tags.join(", ") : "");
      setSlug(r.slug ?? "");
      setThumbnailUrl(r.thumbnailUrl ?? "");
      setScheduledAt(
        r.scheduledAt
          ? new Date(r.scheduledAt).toISOString().slice(0, 16)
          : "",
      );
    } catch {
      setErr("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [id, kind, apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!kind) return;
    setActionMsg(null);
    setSaveBusy(true);
    try {
      const tags = tagsLine
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const body: Record<string, unknown> = {
        titleKo,
        contentKo,
        metaDescription: metaDescription || null,
        tags,
        thumbnailUrl: thumbnailUrl || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };
      if (kind !== "trend_report") {
        body.excerptKo = excerptKo;
        body.slug = slug;
      }
      const res = await fetch(apiBase, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(data.error ?? "저장 실패");
        return;
      }
      setActionMsg("저장했습니다.");
    } catch {
      setActionMsg("네트워크 오류");
    } finally {
      setSaveBusy(false);
    }
  };

  const publish = async (scheduleOnly = false) => {
    if (!kind) return;
    setActionMsg(null);
    setPublishBusy(true);
    try {
      if (!scheduleOnly) await save();
      const res = await fetch(`/api/admin/content/${id}/publish`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(data.error ?? "발행 실패");
        return;
      }
      setStatus(data.content?.status ?? "published");
      setActionMsg(
        scheduledAt && new Date(scheduledAt) > new Date()
          ? "발행 예약을 설정했습니다."
          : "게시했습니다.",
      );
    } catch {
      setActionMsg("네트워크 오류");
    } finally {
      setPublishBusy(false);
    }
  };

  const regenerate = async () => {
    if (!kind || !confirm("AI로 초안을 다시 생성합니다. 현재 본문이 덮어씌워집니다.")) {
      return;
    }
    setRegenBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/admin/content/${id}/regenerate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(data.error ?? "재생성 실패");
        return;
      }
      await load();
      setActionMsg("AI 재생성 완료.");
    } catch {
      setActionMsg("네트워크 오류");
    } finally {
      setRegenBusy(false);
    }
  };

  const remove = async () => {
    if (!kind || !confirm("이 콘텐츠를 삭제할까요?")) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(
        `/api/admin/content/${id}/delete?type=${kind}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        setActionMsg("삭제 실패");
        return;
      }
      window.location.href = `/${locale}/admin/content`;
    } catch {
      setActionMsg("네트워크 오류");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!kind && !loading) {
    return (
      <div className="p-6">
        <p className="text-red-600">{err}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/${locale}/admin/content`}>목록으로</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/admin/content`}>← 목록</Link>
        </Button>
        <span className="rounded border px-2 py-1 font-mono text-xs uppercase">
          {status || "…"}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={regenBusy}
            onClick={() => void regenerate()}
          >
            {regenBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
            재생성
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleteBusy}
            onClick={() => void remove()}
          >
            <Trash2 className="mr-1 h-3 w-3" /> 삭제
          </Button>
          <Button type="button" variant="outline" disabled={saveBusy} onClick={() => void save()}>
            {saveBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            저장
          </Button>
          <Button type="button" disabled={publishBusy} onClick={() => void publish()}>
            {publishBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            {scheduledAt && new Date(scheduledAt) > new Date() ? "예약 발행" : "발행"}
          </Button>
        </div>
      </div>

      {actionMsg ? <p className="text-sm text-emerald-700">{actionMsg}</p> : null}
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">메타 · SEO</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">제목</label>
                <Input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} className="mt-1" />
              </div>
              {kind !== "trend_report" ? (
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Slug</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1" />
                </div>
              ) : null}
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Meta description</label>
                <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">태그 (쉼표)</label>
                <Input value={tagsLine} onChange={(e) => setTagsLine(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">썸네일 URL</label>
                <Input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">발행 예약</label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-1" />
              </div>
              {kind !== "trend_report" ? (
                <div className="md:col-span-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">도입 (excerpt)</label>
                  <Textarea value={excerptKo} onChange={(e) => setExcerptKo(e.target.value)} rows={3} className="mt-1" />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Markdown 편집</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={contentKo}
                  onChange={(e) => setContentKo(e.target.value)}
                  rows={24}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">미리보기</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{contentKo || "_(비어 있음)_"}</ReactMarkdown>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
