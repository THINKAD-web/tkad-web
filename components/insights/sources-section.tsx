import { ExternalLink, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InsightSource } from "@/lib/insights-reports";

/**
 * 출처 섹션 (PR-5) — 본문 하단 필수 노출.
 * trustGrade 별 뱃지 (A/B/C). 외부 링크는 noopener noreferrer.
 */
export function SourcesSection({ sources }: { sources: InsightSource[] }) {
  if (sources.length === 0) return null;

  return (
    <section
      aria-labelledby="insight-sources-heading"
      className="mt-12 rounded-2xl border border-navy/10 bg-slate-50/60 p-6"
    >
      <h2
        id="insight-sources-heading"
        className="mb-3 flex items-center gap-2 text-lg font-bold text-navy"
      >
        <BookOpen className="h-5 w-5 text-gold" aria-hidden />
        참고 자료 ({sources.length})
      </h2>
      <ul className="space-y-2">
        {sources.map((s, i) => (
          <li
            key={s.url || i}
            className="rounded-lg border border-navy/8 bg-white p-3 text-sm shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 font-semibold text-navy underline-offset-2 hover:underline"
                >
                  [{i + 1}] {s.title || s.domain}
                </a>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{s.domain}</span>
                  {s.publishedAt ? <span>· {s.publishedAt}</span> : null}
                  {s.trustGrade ? (
                    <Badge
                      variant="outline"
                      className={
                        s.trustGrade === "A"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : s.trustGrade === "B"
                            ? "border-sky-300 bg-sky-50 text-sky-700"
                            : "border-slate-300 bg-slate-50 text-slate-700"
                      }
                    >
                      {s.trustGrade} 등급
                    </Badge>
                  ) : null}
                </div>
              </div>
              <ExternalLink
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">
        외부 링크는 새 창으로 열리며, THINKAD 가 해당 사이트의 정확성·견해를
        보증하지 않습니다.
      </p>
    </section>
  );
}
