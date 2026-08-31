"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

type TrendRow = {
  id: string;
  month: string;
  status: string;
  titleKo: string;
  updatedAt: string;
};

type AcademyRow = {
  id: string;
  courseId: string;
  status: string;
  titleKo: string;
  updatedAt: string;
};

type SuccessCaseRow = {
  id: string;
  status: string;
  titleKo: string;
  clientName: string;
  industry: string;
  updatedAt: string;
};

export default function AdminAiContentPage() {
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";
  const base = `/${locale}/admin/ai-content`;

  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [lessons, setLessons] = useState<AcademyRow[]>([]);
  const [successCases, setSuccessCases] = useState<SuccessCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [genTrendBusy, setGenTrendBusy] = useState(false);
  const [genTrendErr, setGenTrendErr] = useState<string | null>(null);

  const [courseTitle, setCourseTitle] = useState("OOH 기초");
  const [lessonTitle, setLessonTitle] = useState("");
  const [genLessonBusy, setGenLessonBusy] = useState(false);
  const [genLessonErr, setGenLessonErr] = useState<string | null>(null);

  const [scClient, setScClient] = useState("");
  const [scIndustry, setScIndustry] = useState("");
  const [scMedia, setScMedia] = useState("");
  const [genScBusy, setGenScBusy] = useState(false);
  const [genScErr, setGenScErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const [tr, al, sc] = await Promise.all([
        fetch("/api/admin/trend-reports", { credentials: "include" }),
        fetch("/api/admin/academy-lessons", { credentials: "include" }),
        fetch("/api/admin/success-cases", { credentials: "include" }),
      ]);
      if (!tr.ok || !al.ok || !sc.ok) {
        setLoadError("목록을 불러오지 못했습니다.");
        return;
      }
      const tj = await tr.json();
      const aj = await al.json();
      const sj = await sc.json();
      setTrends(tj.trendReports ?? []);
      setLessons(aj.academyLessons ?? []);
      setSuccessCases(sj.successCases ?? []);
    } catch {
      setLoadError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const draftTrends = useMemo(
    () => trends.filter((r) => r.status === "draft" || r.status === "reviewed"),
    [trends],
  );
  const publishedTrends = useMemo(
    () => trends.filter((r) => r.status === "published"),
    [trends],
  );
  const draftLessons = useMemo(
    () =>
      lessons.filter((r) => r.status === "draft" || r.status === "reviewed"),
    [lessons],
  );
  const publishedLessons = useMemo(
    () => lessons.filter((r) => r.status === "published"),
    [lessons],
  );
  const draftSuccessCases = useMemo(
    () =>
      successCases.filter(
        (r) => r.status === "draft" || r.status === "reviewed",
      ),
    [successCases],
  );
  const publishedSuccessCases = useMemo(
    () => successCases.filter((r) => r.status === "published"),
    [successCases],
  );

  const generateTrend = async () => {
    setGenTrendErr(null);
    setGenTrendBusy(true);
    try {
      const res = await fetch("/api/admin/ai/generate-trend-report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenTrendErr(typeof data.error === "string" ? data.error : "생성 실패");
        return;
      }
      await refresh();
    } catch {
      setGenTrendErr("네트워크 오류");
    } finally {
      setGenTrendBusy(false);
    }
  };

  const generateLesson = async () => {
    setGenLessonErr(null);
    if (!lessonTitle.trim()) {
      setGenLessonErr("강의 제목(초점)을 입력하세요.");
      return;
    }
    setGenLessonBusy(true);
    try {
      const res = await fetch("/api/admin/ai/generate-academy-lesson", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: courseTitle.trim(),
          lessonTitle: lessonTitle.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenLessonErr(
          typeof data.error === "string" ? data.error : "생성 실패",
        );
        return;
      }
      setLessonTitle("");
      await refresh();
    } catch {
      setGenLessonErr("네트워크 오류");
    } finally {
      setGenLessonBusy(false);
    }
  };

  const generateSuccessCase = async () => {
    setGenScErr(null);
    const mediaUsed = scMedia
      .split(/[,，\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!scClient.trim() || !scIndustry.trim() || mediaUsed.length === 0) {
      setGenScErr("광고주(클라이언트), 업종, 매체(쉼표 또는 줄바꿈)를 입력하세요.");
      return;
    }
    setGenScBusy(true);
    try {
      const res = await fetch("/api/admin/ai/generate-success-case", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: scClient.trim(),
          industry: scIndustry.trim(),
          mediaUsed,
          metrics: {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenScErr(
          typeof data.error === "string" ? data.error : "생성 실패",
        );
        return;
      }
      setScClient("");
      setScIndustry("");
      setScMedia("");
      await refresh();
    } catch {
      setGenScErr("네트워크 오류");
    } finally {
      setGenScBusy(false);
    }
  };

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

  return (
    <div className="space-y-8 p-6 text-foreground">
      <div className="flex flex-wrap items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <p className="tkad-type-label text-muted-foreground">
            [ AI CONTENT ]
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">AI 콘텐츠</h1>
          <p className="mt-1 tkad-type-caption tracking-tight text-muted-foreground">
            {`// `}트렌드·아카데미·성공 사례 초안 생성, 검토 및 게시
          </p>
        </div>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-500 dark:bg-red-950/40 dark:text-red-200"
        >
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              트렌드 보고서 생성
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="tkad-type-label text-muted-foreground">
              대상 월
            </label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="max-w-xs"
            />
            {genTrendErr ? (
              <p className="text-sm text-red-600">{genTrendErr}</p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              asChild
            >
              <Link href={`/${locale}/admin/reports/new`}>
                트렌드 리포트 작성 (Tavily+AI)
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              아카데미 강의 생성
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="tkad-type-label text-muted-foreground">
                코스(그룹) 제목
              </label>
              <Input
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="tkad-type-label text-muted-foreground">
                강의 초점 / 제목
              </label>
              <Input
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="예: DOOH 측정 기초"
                className="mt-1"
              />
            </div>
            {genLessonErr ? (
              <p className="text-sm text-red-600">{genLessonErr}</p>
            ) : null}
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href={`/${locale}/admin/academy/new`}>
                아카데미 작성 (AI)
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              성공 사례 생성
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="tkad-type-label text-muted-foreground">
                광고주 / 클라이언트명
              </label>
              <Input
                value={scClient}
                onChange={(e) => setScClient(e.target.value)}
                className="mt-1"
                placeholder="예: OO 브랜드"
              />
            </div>
            <div>
              <label className="tkad-type-label text-muted-foreground">
                업종
              </label>
              <Input
                value={scIndustry}
                onChange={(e) => setScIndustry(e.target.value)}
                className="mt-1"
                placeholder="예: 패션·뷰티"
              />
            </div>
            <div>
              <label className="tkad-type-label text-muted-foreground">
                사용 매체 (쉼표 또는 줄바꿈)
              </label>
              <Input
                value={scMedia}
                onChange={(e) => setScMedia(e.target.value)}
                className="mt-1"
                placeholder="예: 강남역 디지털, 버스쉘터"
              />
            </div>
            {genScErr ? (
              <p className="text-sm text-red-600">{genScErr}</p>
            ) : null}
            <Button
              type="button"
              className="border-2 border-border bg-foreground text-background transition-colors hover:bg-primary hover:border-primary hover:text-primary-foreground"
              disabled={genScBusy || loading}
              onClick={() => void generateSuccessCase()}
            >
              {genScBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              AI로 초안 생성 · DB 저장
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">
            검토 대기 (Draft / Reviewed)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          ) : (
            <>
              <div>
                <p className="mb-2 tkad-type-label text-muted-foreground">
                  트렌드
                </p>
                <ul className="space-y-2 text-sm">
                  {draftTrends.length === 0 ? (
                    <li className="text-muted-foreground">없음</li>
                  ) : (
                    draftTrends.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/10 py-2 border-border/15"
                      >
                        <span className="font-medium text-foreground">
                          {r.month} · {r.titleKo}
                        </span>
                        <span className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`${base}/edit/${r.id}?type=trend_report`}
                            >
                              편집
                            </Link>
                          </Button>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-2 tkad-type-label text-muted-foreground">
                  아카데미
                </p>
                <ul className="space-y-2 text-sm">
                  {draftLessons.length === 0 ? (
                    <li className="text-muted-foreground">없음</li>
                  ) : (
                    draftLessons.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/10 py-2 border-border/15"
                      >
                        <span className="font-medium text-foreground">
                          {r.courseId} · {r.titleKo}
                        </span>
                        <span className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`${base}/edit/${r.id}?type=academy_lesson`}
                            >
                              편집
                            </Link>
                          </Button>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-2 tkad-type-label text-muted-foreground">
                  성공 사례
                </p>
                <ul className="space-y-2 text-sm">
                  {draftSuccessCases.length === 0 ? (
                    <li className="text-muted-foreground">없음</li>
                  ) : (
                    draftSuccessCases.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/10 py-2 border-border/15"
                      >
                        <span className="font-medium text-foreground">
                          {r.clientName} · {r.industry} — {r.titleKo}
                        </span>
                        <span className="flex items-center gap-2">
                          {statusBadge(r.status)}
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`${base}/edit/${r.id}?type=success_case`}
                            >
                              편집
                            </Link>
                          </Button>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">게시됨</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 tkad-type-label text-muted-foreground">
              트렌드
            </p>
            <ul className="space-y-2 text-sm">
              {publishedTrends.length === 0 ? (
                <li className="text-muted-foreground">없음</li>
              ) : (
                publishedTrends.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/10 py-2 border-border/15"
                  >
                    <span>
                      {r.month} · {r.titleKo}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${base}/edit/${r.id}?type=trend_report`}>
                        보기/수정
                      </Link>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 tkad-type-label text-muted-foreground">
              아카데미
            </p>
            <ul className="space-y-2 text-sm">
              {publishedLessons.length === 0 ? (
                <li className="text-muted-foreground">없음</li>
              ) : (
                publishedLessons.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/10 py-2 border-border/15"
                  >
                    <span>
                      {r.courseId} · {r.titleKo}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${base}/edit/${r.id}?type=academy_lesson`}>
                        보기/수정
                      </Link>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 tkad-type-label text-muted-foreground">
              성공 사례
            </p>
            <ul className="space-y-2 text-sm">
              {publishedSuccessCases.length === 0 ? (
                <li className="text-muted-foreground">없음</li>
              ) : (
                publishedSuccessCases.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/10 py-2 border-border/15"
                  >
                    <span>
                      {r.clientName} · {r.titleKo}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`${base}/edit/${r.id}?type=success_case`}
                      >
                        보기/수정
                      </Link>
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
