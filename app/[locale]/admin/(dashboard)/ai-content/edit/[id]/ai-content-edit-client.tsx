"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type ContentKind = "trend_report" | "academy_lesson" | "success_case";

export default function AdminAiContentEditClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "ko";
  const id = String(params.id ?? "");
  const typeRaw = searchParams.get("type")?.trim();
  const kind: ContentKind | null =
    typeRaw === "trend_report" ||
    typeRaw === "academy_lesson" ||
    typeRaw === "success_case"
      ? typeRaw
      : null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [titleKo, setTitleKo] = useState("");
  const [contentKo, setContentKo] = useState("");
  const [descriptionKo, setDescriptionKo] = useState("");
  const [chaptersJson, setChaptersJson] = useState("[]");

  const [scClientName, setScClientName] = useState("");
  const [scIndustry, setScIndustry] = useState("");
  const [scTitleEn, setScTitleEn] = useState("");
  const [scSummaryKo, setScSummaryKo] = useState("");
  const [scChallengeKo, setScChallengeKo] = useState("");
  const [scSolutionKo, setScSolutionKo] = useState("");
  const [scResultsLines, setScResultsLines] = useState("");
  const [scMediaLine, setScMediaLine] = useState("");
  const [scMetricsJson, setScMetricsJson] = useState("{}");
  const [scTestimonial, setScTestimonial] = useState("");
  const [scThumbnail, setScThumbnail] = useState("");
  const [scGalleryLines, setScGalleryLines] = useState("");

  const [saveBusy, setSaveBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !kind) {
      setLoading(false);
      setErr(
        "type 쿼리가 필요합니다 (?type=trend_report | academy_lesson | success_case)",
      );
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const url =
        kind === "trend_report"
          ? `/api/admin/trend-reports/${id}`
          : kind === "academy_lesson"
            ? `/api/admin/academy-lessons/${id}`
            : `/api/admin/success-cases/${id}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "불러오기 실패");
        return;
      }
      if (kind === "trend_report") {
        const r = data.trendReport;
        setStatus(r.status);
        setTitleKo(r.titleKo ?? "");
        setContentKo(r.contentKo ?? "");
      } else if (kind === "academy_lesson") {
        const r = data.academyLesson;
        setStatus(r.status);
        setTitleKo(r.titleKo ?? "");
        setDescriptionKo(r.descriptionKo ?? "");
        setChaptersJson(JSON.stringify(r.chapters ?? [], null, 2));
      } else {
        const r = data.successCase;
        setStatus(r.status);
        setTitleKo(r.titleKo ?? "");
        setScClientName(r.clientName ?? "");
        setScIndustry(r.industry ?? "");
        setScTitleEn(r.titleEn ?? "");
        setScSummaryKo(r.summaryKo ?? "");
        setScChallengeKo(r.challengeKo ?? "");
        setScSolutionKo(r.solutionKo ?? "");
        setScResultsLines((r.resultsKo as string[] | undefined)?.join("\n") ?? "");
        setScMediaLine((r.mediaUsed as string[] | undefined)?.join(", ") ?? "");
        setScMetricsJson(
          JSON.stringify(r.metricsJson ?? {}, null, 2),
        );
        setScTestimonial(r.testimonialKo ?? "");
        setScThumbnail(r.thumbnailUrl ?? "");
        setScGalleryLines((r.galleryUrls as string[] | undefined)?.join("\n") ?? "");
      }
    } catch {
      setErr("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [id, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!kind) return;
    setActionMsg(null);
    setSaveBusy(true);
    try {
      if (kind === "trend_report") {
        const res = await fetch(`/api/admin/trend-reports/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titleKo, contentKo }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionMsg(data.error ?? "저장 실패");
          return;
        }
        setStatus(data.trendReport?.status ?? status);
        setActionMsg("저장했습니다.");
      } else if (kind === "academy_lesson") {
        let chapters: unknown;
        try {
          chapters = JSON.parse(chaptersJson);
        } catch {
          setActionMsg("chapters JSON 형식이 올바르지 않습니다.");
          return;
        }
        if (!Array.isArray(chapters)) {
          setActionMsg("chapters는 배열이어야 합니다.");
          return;
        }
        const res = await fetch(`/api/admin/academy-lessons/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titleKo, descriptionKo, chapters }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionMsg(data.error ?? "저장 실패");
          return;
        }
        setStatus(data.academyLesson?.status ?? status);
        setActionMsg("저장했습니다.");
      } else {
        let metricsJson: unknown;
        try {
          metricsJson = JSON.parse(scMetricsJson || "{}");
        } catch {
          setActionMsg("metrics JSON 형식이 올바르지 않습니다.");
          return;
        }
        if (metricsJson !== null && typeof metricsJson !== "object") {
          setActionMsg("metrics는 객체(JSON)여야 합니다.");
          return;
        }
        const resultsKo = scResultsLines
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const mediaUsed = scMediaLine
          .split(/[,，\n]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const galleryUrls = scGalleryLines
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const res = await fetch(`/api/admin/success-cases/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: scClientName,
            industry: scIndustry,
            titleKo,
            titleEn: scTitleEn.trim() || null,
            summaryKo: scSummaryKo,
            challengeKo: scChallengeKo,
            solutionKo: scSolutionKo,
            resultsKo,
            mediaUsed,
            metricsJson,
            testimonialKo: scTestimonial.trim() || null,
            thumbnailUrl: scThumbnail.trim() || null,
            galleryUrls,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setActionMsg(data.error ?? "저장 실패");
          return;
        }
        setStatus(data.successCase?.status ?? status);
        setActionMsg("저장했습니다.");
      }
    } catch {
      setActionMsg("네트워크 오류");
    } finally {
      setSaveBusy(false);
    }
  };

  const markReviewed = async () => {
    setActionMsg(null);
    setReviewBusy(true);
    try {
      const res = await fetch(`/api/admin/content/${id}/review`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(data.error ?? "실패");
        return;
      }
      setStatus(data.content?.status ?? "reviewed");
      setActionMsg("검토 완료로 변경했습니다.");
    } catch {
      setActionMsg("네트워크 오류");
    } finally {
      setReviewBusy(false);
    }
  };

  const publish = async () => {
    setActionMsg(null);
    setPublishBusy(true);
    try {
      const res = await fetch(`/api/admin/content/${id}/publish`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg(data.error ?? "실패");
        return;
      }
      setStatus(data.content?.status ?? "published");
      setActionMsg("게시했습니다.");
    } catch {
      setActionMsg("네트워크 오류");
    } finally {
      setPublishBusy(false);
    }
  };

  if (!kind && !loading) {
    return (
      <div className="p-6">
        <p className="text-red-600">{err}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={`/${locale}/admin/ai-content`}>목록으로</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/admin/ai-content`}>← 목록</Link>
        </Button>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-navy">
          {status || "…"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          불러오는 중…
        </div>
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : (
        <>
          {actionMsg ? (
            <p className="text-sm text-emerald-700">{actionMsg}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-navy text-white"
              disabled={saveBusy}
              onClick={() => void save()}
            >
              {saveBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              저장
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={reviewBusy || status === "published"}
              onClick={() => void markReviewed()}
            >
              {reviewBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              검토 완료
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-gold text-navy hover:bg-gold-dark"
              disabled={publishBusy || status === "published"}
              onClick={() => void publish()}
            >
              {publishBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              게시
            </Button>
          </div>

          {kind === "success_case" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-navy/10">
                <CardHeader>
                  <CardTitle className="text-base">편집</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold">클라이언트</label>
                      <Input
                        className="mt-1"
                        value={scClientName}
                        onChange={(e) => setScClientName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">업종</label>
                      <Input
                        className="mt-1"
                        value={scIndustry}
                        onChange={(e) => setScIndustry(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold">제목 (KO)</label>
                    <Input
                      className="mt-1"
                      value={titleKo}
                      onChange={(e) => setTitleKo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">제목 (EN)</label>
                    <Input
                      className="mt-1"
                      value={scTitleEn}
                      onChange={(e) => setScTitleEn(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">요약 (KO)</label>
                    <Textarea
                      className="mt-1 min-h-[80px]"
                      value={scSummaryKo}
                      onChange={(e) => setScSummaryKo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">과제 (KO)</label>
                    <Textarea
                      className="mt-1 min-h-[120px]"
                      value={scChallengeKo}
                      onChange={(e) => setScChallengeKo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">솔루션 (KO)</label>
                    <Textarea
                      className="mt-1 min-h-[120px]"
                      value={scSolutionKo}
                      onChange={(e) => setScSolutionKo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      성과 bullet (줄마다 한 줄)
                    </label>
                    <Textarea
                      className="mt-1 min-h-[100px] font-mono text-sm"
                      value={scResultsLines}
                      onChange={(e) => setScResultsLines(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      매체 (쉼표 구분)
                    </label>
                    <Input
                      className="mt-1"
                      value={scMediaLine}
                      onChange={(e) => setScMediaLine(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">metrics JSON</label>
                    <Textarea
                      className="mt-1 min-h-[120px] font-mono text-xs"
                      value={scMetricsJson}
                      onChange={(e) => setScMetricsJson(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">썸네일 URL</label>
                    <Input
                      className="mt-1"
                      value={scThumbnail}
                      onChange={(e) => setScThumbnail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      갤러리 URL (줄마다)
                    </label>
                    <Textarea
                      className="mt-1 min-h-[80px] font-mono text-xs"
                      value={scGalleryLines}
                      onChange={(e) => setScGalleryLines(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">고객 후기 (KO)</label>
                    <Textarea
                      className="mt-1 min-h-[80px]"
                      value={scTestimonial}
                      onChange={(e) => setScTestimonial(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-navy/10">
                <CardHeader>
                  <CardTitle className="text-base">미리보기</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none text-navy">
                  <h3>{titleKo || "(제목)"}</h3>
                  <p className="text-muted-foreground">{scSummaryKo}</p>
                  <h4 className="text-sm">과제</h4>
                  <ReactMarkdown>
                    {scChallengeKo || "_(비어 있음)_"}
                  </ReactMarkdown>
                  <h4 className="text-sm">솔루션</h4>
                  <ReactMarkdown>
                    {scSolutionKo || "_(비어 있음)_"}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            </div>
          ) : kind === "trend_report" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-navy/10">
                <CardHeader>
                  <CardTitle className="text-base">편집</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold">제목 (KO)</label>
                    <Input
                      className="mt-1"
                      value={titleKo}
                      onChange={(e) => setTitleKo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      본문 Markdown
                    </label>
                    <Textarea
                      className="mt-1 min-h-[420px] font-mono text-sm"
                      value={contentKo}
                      onChange={(e) => setContentKo(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-navy/10">
                <CardHeader>
                  <CardTitle className="text-base">미리보기</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none text-navy prose-headings:text-navy">
                  <ReactMarkdown>{contentKo || "_(비어 있음)_"}</ReactMarkdown>
                </CardContent>
              </Card>
            </div>
          ) : kind === "academy_lesson" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-navy/10">
                <CardHeader>
                  <CardTitle className="text-base">편집</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold">제목 (KO)</label>
                    <Input
                      className="mt-1"
                      value={titleKo}
                      onChange={(e) => setTitleKo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">설명 (KO)</label>
                    <Textarea
                      className="mt-1 min-h-[100px]"
                      value={descriptionKo}
                      onChange={(e) => setDescriptionKo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">
                      chapters JSON (배열: title, content)
                    </label>
                    <Textarea
                      className="mt-1 min-h-[360px] font-mono text-xs"
                      value={chaptersJson}
                      onChange={(e) => setChaptersJson(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-navy/10">
                <CardHeader>
                  <CardTitle className="text-base">첫 챕터 미리보기</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none text-navy prose-headings:text-navy">
                  {(() => {
                    try {
                      const ch = JSON.parse(chaptersJson) as unknown;
                      if (!Array.isArray(ch) || ch.length === 0) {
                        return (
                          <p className="text-muted-foreground">챕터 없음</p>
                        );
                      }
                      const first = ch[0] as {
                        title?: string;
                        content?: string;
                      };
                      return (
                        <>
                          <h3>{first.title ?? "(제목 없음)"}</h3>
                          <ReactMarkdown>
                            {first.content || "_(내용 없음)_"}
                          </ReactMarkdown>
                        </>
                      );
                    } catch {
                      return <p className="text-red-600">JSON 파싱 오류</p>;
                    }
                  })()}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
