import { ExternalLink, BookOpen } from "lucide-react";
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
      className="mt-12 border-2 border-border bg-muted p-6"
    >
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
        [ SOURCES / {sources.length} ]
      </p>
      <h2
        id="insight-sources-heading"
        className="mt-2 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground"
      >
        <BookOpen className="h-5 w-5 text-accent" aria-hidden />
        참고 자료 ({sources.length})
      </h2>
      <ul className="mt-4 space-y-0">
        {sources.map((s, i) => (
          <li
            key={s.url || i}
            className="-mt-[2px] border-2 border-border bg-card p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 font-bold tracking-tight text-foreground transition-colors hover:text-accent"
                >
                  <span className="text-accent">[{i + 1}]</span> {s.title || s.domain}
                </a>
                <div className="flex flex-wrap items-center gap-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{s.domain}</span>
                  {s.publishedAt ? <span>· {s.publishedAt}</span> : null}
                  {s.trustGrade ? (
                    <span
                      className={
                        s.trustGrade === "A"
                          ? "border-2 border-accent bg-accent px-2 py-0.5 font-bold text-accent-foreground"
                          : s.trustGrade === "B"
                            ? "border-2 border-border bg-hero-void px-2 py-0.5 font-bold text-hero-fg"
                            : "border-2 border-border bg-card px-2 py-0.5 font-bold text-foreground"
                      }
                    >
                      [ {s.trustGrade} 등급 ]
                    </span>
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
      <p className="mt-4 text-[11px] tracking-tight text-muted-foreground">
        {`// `}외부 링크는 새 창으로 열리며, THINKAD 가 해당 사이트의 정확성·견해를
        보증하지 않습니다.
      </p>
    </section>
  );
}
