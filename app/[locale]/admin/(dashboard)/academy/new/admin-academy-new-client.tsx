"use client";

import { useCallback, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, RefreshCw, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ACADEMY_ADMIN_CATEGORIES,
  academyCategoryById,
  type AcademyCategoryId,
} from "@/lib/academy-admin-categories";
import { AiGenerationProgress } from "@/components/admin/ai-generation-progress";
import { consumeAdminSse } from "@/lib/admin-sse";

type LogLine = { id: string; text: string; tone?: "default" | "ok" | "error" };

type ProgressEvent =
  | { phase: "generating"; message: string }
  | { phase: "saving"; message: string }
  | { phase: "complete"; academyLesson: { id: string; titleKo: string } }
  | { phase: "error"; error: string };

export default function AdminAcademyNewClient() {
  const pathname = usePathname();
  const router = useRouter();
  const logId = useId();
  const locale = pathname.split("/")[1] || "ko";

  const [categoryId, setCategoryId] = useState<AcademyCategoryId>("ooh-basics");
  const [courseTitle, setCourseTitle] = useState(
    ACADEMY_ADMIN_CATEGORIES[0]!.courseTitle,
  );
  const [lessonTitle, setLessonTitle] = useState(
    ACADEMY_ADMIN_CATEGORIES[0]!.lessonTopic,
  );
  const [lessonId, setLessonId] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [descriptionKo, setDescriptionKo] = useState("");
  const [chaptersJson, setChaptersJson] = useState("[]");
  const [status, setStatus] = useState("draft");

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

  const onCategoryChange = (id: AcademyCategoryId) => {
    setCategoryId(id);
    const cat = academyCategoryById(id);
    if (cat) {
      setCourseTitle(cat.courseTitle);
      setLessonTitle(cat.lessonTopic);
    }
  };

  const loadLesson = async (id: string) => {
    const res = await fetch(`/api/admin/academy-lessons/${id}`, {
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const r = data.academyLesson;
    setTitleKo(r.titleKo ?? "");
    setDescriptionKo(r.descriptionKo ?? "");
    setChaptersJson(JSON.stringify(r.chapters ?? [], null, 2));
    setStatus(r.status ?? "draft");
    setCourseTitle(r.courseId ?? courseTitle);
  };

  const runGenerate = async (regenerate: boolean) => {
    setGenBusy(true);
    setErr(null);
    setMsg(null);
    setLogs([]);
    pushLog(regenerate ? "AI 아티클 재생성" : "AI 아티클 생성 시작");

    try {
      const res = await fetch("/api/admin/academy/generate-ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          courseTitle,
          lessonTitle,
          stream: true,
          lessonId: regenerate && lessonId ? lessonId : undefined,
        }),
      });

      if (!res.ok && res.headers.get("content-type")?.includes("json")) {
        const data = await res.json().catch(() => ({}));
        setErr(typeof data.error === "string" ? data.error : "생성 실패");
        pushLog("생성 실패", "error");
        return;
      }

      await consumeAdminSse<ProgressEvent>(res, (event) => {
        if (event.phase === "generating" || event.phase === "saving") {
          pushLog(event.message);
        } else if (event.phase === "complete") {
          setLessonId(event.academyLesson.id);
          pushLog(`완료: ${event.academyLesson.titleKo}`, "ok");
          setMsg("초안이 생성되었습니다. 편집 후 발행하세요.");
          void loadLesson(event.academyLesson.id);
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
    if (!lessonId) {
      setErr("먼저 AI 초안을 생성하세요.");
      return;
    }
    let chapters: unknown;
    try {
      chapters = JSON.parse(chaptersJson);
    } catch {
      setErr("chapters JSON 형식이 올바르지 않습니다.");
      return;
    }
    if (!Array.isArray(chapters)) {
      setErr("chapters는 배열이어야 합니다.");
      return;
    }
    setSaveBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/academy-lessons/${lessonId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleKo, descriptionKo, chapters }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "저장 실패");
        return;
      }
      setStatus(data.academyLesson?.status ?? status);
      setMsg("임시 저장했습니다.");
    } catch {
      setErr("네트워크 오류");
    } finally {
      setSaveBusy(false);
    }
  };

  const publish = async () => {
    if (!lessonId) {
      setErr("먼저 AI 초안을 생성하세요.");
      return;
    }
    setPublishBusy(true);
    setErr(null);
    try {
      let chapters: unknown;
      try {
        chapters = JSON.parse(chaptersJson);
      } catch {
        setErr("chapters JSON 형식이 올바르지 않습니다.");
        return;
      }
      const patchRes = await fetch(`/api/admin/academy-lessons/${lessonId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleKo, descriptionKo, chapters }),
      });
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}));
        setErr(typeof data.error === "string" ? data.error : "저장 실패");
        return;
      }
      const res = await fetch(`/api/admin/content/${lessonId}/publish`, {
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

  return (
    <div className="space-y-6 p-6 text-foreground">
      <header>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/80">
          [ ACADEMY ]
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          아카데미 아티클 작성
        </h1>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {`// 카테고리 선택 → Claude 초안 · 상태: ${status}`}
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href={`/${locale}/admin/ai-content`}>AI 콘텐츠 목록</Link>
        </Button>
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

      <section className="rounded-2xl border border-border/60 bg-card/40 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              카테고리
            </label>
            <select
              value={categoryId}
              onChange={(e) =>
                onCategoryChange(e.target.value as AcademyCategoryId)
              }
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              disabled={genBusy}
            >
              {ACADEMY_ADMIN_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              코스 제목
            </label>
            <Input
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="mt-1"
              disabled={genBusy}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              레슨 주제
            </label>
            <Input
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              className="mt-1"
              disabled={genBusy}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
          {lessonId ? (
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
          {lessonId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(
                  `/${locale}/admin/ai-content/edit/${lessonId}?type=academy_lesson`,
                )
              }
            >
              고급 편집기
            </Button>
          ) : null}
        </div>
        <div className="mt-4">
          <AiGenerationProgress lines={logs} busy={genBusy} />
        </div>
      </section>

      {lessonId || titleKo ? (
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
              소개
            </label>
            <Textarea
              value={descriptionKo}
              onChange={(e) => setDescriptionKo(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              챕터 (JSON)
            </label>
            <Textarea
              value={chaptersJson}
              onChange={(e) => setChaptersJson(e.target.value)}
              rows={14}
              className="mt-1 font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
