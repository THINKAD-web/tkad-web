"use client";

import { useCallback, useState } from "react";
import { Link2, Loader2, RefreshCw } from "lucide-react";
import type { LinkHealthResult } from "@/lib/link-health";

type Props = { locale: string };

export function AdminBrokenLinksClient({ locale }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkHealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/health/links?locale=ko&mediaLimit=50`,
        { credentials: "include" },
      );
      const data = (await res.json()) as LinkHealthResult & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const prefix = `/${locale}`;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">링크 헬스</h1>
          <p className="mt-1 tkad-type-caption text-muted-foreground">
            {`// 내부 URL fetch · 404·타임아웃 · /tools 리다이렉트 확인`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runScan()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 tkad-type-title hover:bg-muted disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          전수 스캔
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <>
          <section className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur">
            <p className="tkad-type-caption text-muted-foreground">
              {`// base ${result.baseUrl} · scanned ${result.scanned} · ok ${result.okCount} · broken ${result.broken.length} · redirects ${result.redirected.length}`}
            </p>
            <p className="mt-1 tkad-type-note text-muted-foreground">
              {new Date(result.checkedAt).toLocaleString("ko-KR")}
            </p>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
            <h2 className="flex items-center gap-2 border-b border-border/60 px-4 py-3 tkad-type-label text-muted-foreground">
              <Link2 className="h-4 w-4 text-red-400/80" aria-hidden />
              [ Broken links — {result.broken.length} ]
            </h2>
            {result.broken.length === 0 ? (
              <p className="px-4 py-8 text-center tkad-type-caption text-emerald-400/90">
                깨진 링크 없음
              </p>
            ) : (
              <ul className="max-h-[420px] divide-y divide-border/50 overflow-y-auto">
                {result.broken.map((row) => (
                  <li key={row.url} className="px-4 py-3">
                    <p className="tkad-type-note text-primary">{row.path}</p>
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate text-sm hover:underline"
                    >
                      {row.url}
                    </a>
                    <p className="mt-1 tkad-type-note text-amber-300">
                      {row.status != null ? `HTTP ${row.status}` : "—"}
                      {row.error ? ` · ${row.error}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {result.redirected.length > 0 ? (
            <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
              <h2 className="border-b border-border/60 px-4 py-3 tkad-type-label text-muted-foreground">
                [ Redirects — {result.redirected.length} ]
              </h2>
              <ul className="max-h-64 divide-y divide-border/50 overflow-y-auto">
                {result.redirected.map((row) => (
                  <li key={row.url} className="px-4 py-3">
                    <p className="tkad-type-note">{row.path}</p>
                    <p className="mt-1 truncate tkad-type-note text-muted-foreground">
                      → {row.finalUrl}
                    </p>
                    <p className="mt-1 tkad-type-note text-sky-300">
                      HTTP {row.status}
                      {row.path.startsWith("/tools") ? " · /tools → /planner OK" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className="tkad-type-caption text-muted-foreground">
          {`// 「전수 스캔」을 눌러 시작하세요.`}
        </p>
      )}

      <p className="tkad-type-note text-muted-foreground">
        API:{" "}
        <a
          href={`${prefix}/api/admin/health/links`}
          className="underline"
        >
          GET /api/admin/health/links
        </a>
      </p>
    </div>
  );
}
