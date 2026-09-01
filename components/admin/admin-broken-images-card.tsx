"use client";

import Link from "next/link";
import { ImageOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { MediaImageHealthResult } from "@/lib/media-image-health";

type Props = {
  locale: string;
};

export function AdminBrokenImagesCard({ locale }: Props) {
  const prefix = `/${locale}`;
  const [result, setResult] = useState<MediaImageHealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/health/images", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await res.json()) as MediaImageHealthResult & {
          ok?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || data.ok === false) {
          setError(data.error ?? `HTTP ${res.status}`);
          return;
        }
        setResult({
          scanned: data.scanned,
          broken: data.broken,
          checkedAt: data.checkedAt,
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "scan_failed");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { broken, scanned, checkedAt } = result ?? {
    broken: [],
    scanned: 0,
    checkedAt: null as string | null,
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <h2 className="flex items-center gap-2 tkad-type-label text-muted-foreground">
          <ImageOff className="h-4 w-4 text-amber-400/80" aria-hidden />
          [ Media thumbnail health ]
        </h2>
        {checkedAt ? (
          <span className="tkad-type-note text-muted-foreground">
            {new Date(checkedAt).toLocaleString("ko-KR")}
          </span>
        ) : null}
      </div>

      {!result && !error ? (
        <p className="flex items-center justify-center gap-2 px-4 py-8 text-center tkad-type-label text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          썸네일 검사 중…
        </p>
      ) : error ? (
        <p className="px-4 py-8 text-center text-xs text-amber-300">
          썸네일 검사 실패: {error}
        </p>
      ) : (
        <>
          <p className="border-b border-border/40 px-4 py-2 tkad-type-caption text-muted-foreground">
            {`// scanned ${scanned} · broken ${broken.length}`}
          </p>

          {broken.length === 0 ? (
            <p className="px-4 py-8 text-center tkad-type-label text-emerald-400/90">
              모든 썸네일 URL 응답 정상
            </p>
          ) : (
            <ul className="max-h-64 divide-y divide-border/50 overflow-y-auto">
              {broken.map((row) => (
                <li key={row.mediaId} className="px-4 py-3">
                  <Link
                    href={`${prefix}/admin/medias/${row.mediaId}/edit`}
                    className="text-sm font-bold hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-1 truncate tkad-type-note text-muted-foreground">
                    {row.thumbnailUrl}
                  </p>
                  <p className="mt-1 tkad-type-note text-amber-300">
                    {row.status != null ? `HTTP ${row.status}` : "—"}
                    {row.error ? ` · ${row.error}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
