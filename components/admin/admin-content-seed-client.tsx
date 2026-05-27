"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, Loader2, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type SeedResultRow = {
  status: string;
  title?: string;
  slug?: string;
  href?: string;
  error?: string;
};

type SeedResponse = {
  success?: boolean;
  message?: string;
  created?: number;
  skipped?: number;
  errors?: number;
  results?: SeedResultRow[];
  error?: string;
};

type JobKey = "reports" | "cases" | "academy";

const JOBS: {
  key: JobKey;
  label: string;
  endpoint: string;
  icon: typeof FileText;
  publicHref: string;
}[] = [
  {
    key: "reports",
    label: "트렌드 리포트 5건 생성",
    endpoint: "/api/admin/seed/reports",
    icon: FileText,
    publicHref: "/ko/report",
  },
  {
    key: "cases",
    label: "성공 사례 5건 생성",
    endpoint: "/api/admin/seed/cases",
    icon: Trophy,
    publicHref: "/ko/cases",
  },
  {
    key: "academy",
    label: "아카데미 콘텐츠 5건 생성",
    endpoint: "/api/admin/seed/academy",
    icon: BookOpen,
    publicHref: "/ko/academy",
  },
];

function rowLabel(r: SeedResultRow): string {
  return r.title ?? r.slug ?? "—";
}

export function AdminContentSeedClient({ locale }: { locale: string }) {
  const [loading, setLoading] = useState<JobKey | null>(null);
  const [last, setLast] = useState<Partial<Record<JobKey, SeedResponse>>>({});

  const run = useCallback(async (job: (typeof JOBS)[number]) => {
    setLoading(job.key);
    try {
      const res = await fetch(job.endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as SeedResponse;
      if (!res.ok && !data.results) {
        setLast((prev) => ({
          ...prev,
          [job.key]: { error: data.error ?? `HTTP ${res.status}` },
        }));
        return;
      }
      setLast((prev) => ({ ...prev, [job.key]: data }));
    } catch (e) {
      setLast((prev) => ({
        ...prev,
        [job.key]: {
          error: e instanceof Error ? e.message : "network_error",
        },
      }));
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-lg font-black uppercase tracking-widest text-foreground">
          AI 콘텐츠 시드
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Claude API로 트렌드 리포트·성공 사례·아카데미 레슨을 일괄 생성합니다.
          기존 slug/제목이 있으면 건너뜁니다. 호출 간 1초 대기.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {JOBS.map((job) => {
          const Icon = job.icon;
          const result = last[job.key];
          const busy = loading === job.key;

          return (
            <div
              key={job.key}
              className="flex flex-col rounded-xl border-2 border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 text-xs font-display uppercase tracking-wider text-muted-foreground">
                <Icon className="h-4 w-4" />
                {job.label}
              </div>

              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void run(job)}
                className={cn(
                  "mt-4 inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary bg-primary px-4 py-2.5 text-xs font-bold uppercase text-primary-foreground transition-opacity",
                  loading !== null && !busy && "opacity-50",
                )}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {busy ? "생성 중…" : "실행"}
              </button>

              <Link
                href={job.publicHref}
                className="mt-3 text-xs text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                공개 페이지 보기 →
              </Link>

              {result?.error ? (
                <p className="mt-3 text-xs text-rose-500">{result.error}</p>
              ) : null}

              {result?.success || result?.results ? (
                <div className="mt-3 space-y-2 text-xs">
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    완료 — 생성 {result.created ?? 0} · 스킵{" "}
                    {result.skipped ?? 0} · 오류 {result.errors ?? 0}
                  </p>
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-muted-foreground">
                    {(result.results ?? []).map((r, i) => (
                      <li key={`${job.key}-${i}`}>
                        <span
                          className={cn(
                            r.status === "error" && "text-rose-500",
                            r.status === "created" && "text-foreground",
                          )}
                        >
                          [{r.status}] {rowLabel(r)}
                        </span>
                        {r.href ? (
                          <>
                            {" "}
                            <Link
                              href={r.href}
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              링크
                            </Link>
                          </>
                        ) : null}
                        {r.error ? (
                          <span className="block text-rose-500">{r.error}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        어드민 홈:{" "}
        <Link href={`/${locale}/admin/content`} className="text-primary hover:underline">
          콘텐츠 검수
        </Link>
      </p>
    </div>
  );
}
